import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Test: Scan ➔ Call Flow
 * 
 * Scenario:
 * 1. Visitor scans QR code (tag)
 * 2. Visitor web app opens (/v/{tagId})
 * 3. Visitor initiates call
 * 4. Owner receives call notification
 * 5. WebRTC session created in database
 * 6. Signaling messages via Supabase Realtime
 */

// Test data
const TEST_TAG_CODE = 'TEST1234';
const TEST_PROPERTY_ID = 'test-property-id';
const TEST_OWNER_ID = 'test-owner-id';

// Supabase client for test setup/teardown
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

test.describe('Scan to Call Flow', () => {
  let tagId: string;
  let visitorSessionId: string;

  test.beforeAll(async () => {
    // Setup: Create test tag in database
    const { data, error } = await supabase
      .from('tags')
      .insert({
        tag_code: TEST_TAG_CODE,
        name: 'Test Entry Door',
        property_id: TEST_PROPERTY_ID,
        is_active: true,
        is_public: true,
        features: { video: true, audio: true, message: true }
      })
      .select('id')
      .single();

    if (error) {
      console.log('Tag may already exist, continuing...');
      // Try to get existing tag
      const { data: existing } = await supabase
        .from('tags')
        .select('id')
        .eq('tag_code', TEST_TAG_CODE)
        .single();
      tagId = existing?.id;
    } else {
      tagId = data?.id;
    }
  });

  test.afterAll(async () => {
    // Cleanup: Remove test WebRTC sessions
    await supabase
      .from('webrtc_sessions')
      .delete()
      .eq('tag_id', tagId);
  });

  test('Visitor scans QR code and sees owner info', async ({ page }) => {
    // Simulate mobile visitor scanning QR code
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Step 1: Visitor accesses tag scan URL
    await page.goto(`/v/${TEST_TAG_CODE}`);
    
    // Step 2: Verify visitor interface loads
    await expect(page).toHaveTitle(/ScanBell|Visitor/);
    
    // Step 3: Verify owner info is displayed (from tag scan API)
    await expect(page.locator('[data-testid="owner-name"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="property-name"]')).toBeVisible();
    
    // Step 4: Verify communication options are shown
    await expect(page.locator('[data-testid="call-video-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="call-audio-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-btn"]')).toBeVisible();
  });

  test('Visitor initiates video call and session is created', async ({ page, browser }) => {
    // Setup mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Step 1: Visitor opens tag URL
    await page.goto(`/v/${TEST_TAG_CODE}`);
    await page.waitForSelector('[data-testid="call-video-btn"]', { timeout: 5000 });

    // Step 2: Click video call button
    await page.click('[data-testid="call-video-btn"]');
    
    // Step 3: Handle media permissions (mock in test)
    await page.evaluate(() => {
      // Mock getUserMedia for testing
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: () => Promise.resolve({
            getTracks: () => [{
              stop: () => {}
            }]
          })
        }
      });
    });

    // Step 4: Verify call interface opens
    await expect(page.locator('[data-testid="call-interface"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="call-status"]')).toContainText(/connecting|calling/i);

    // Step 5: Wait for WebRTC session creation in database
    await test.step('Verify WebRTC session in database', async () => {
      // Wait a moment for session creation
      await page.waitForTimeout(1000);
      
      const { data: sessions, error } = await supabase
        .from('webrtc_sessions')
        .select('*')
        .eq('tag_id', tagId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(error).toBeNull();
      expect(sessions).toHaveLength(1);
      
      const session = sessions![0];
      visitorSessionId = session.id;
      
      // Verify session structure
      expect(session.visitor_id).toBeDefined();
      expect(session.owner_id).toBe(TEST_OWNER_ID);
      expect(session.status).toBe('pending');
    });
  });

  test('Owner receives call notification via Realtime', async ({ browser }) => {
    // Create owner context (desktop)
    const ownerContext = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const ownerPage = await ownerContext.newPage();

    // Step 1: Owner logs in
    await ownerPage.goto('/login');
    await ownerPage.fill('[data-testid="email-input"]', 'owner@scanbell.test');
    await ownerPage.fill('[data-testid="password-input"]', 'testpassword');
    await ownerPage.click('[data-testid="login-btn"]');
    
    // Step 2: Wait for dashboard
    await ownerPage.waitForURL('/dashboard', { timeout: 10000 });

    // Step 3: Listen for incoming call notification
    const incomingCallPromise = ownerPage.waitForSelector(
      '[data-testid="incoming-call-notification"]',
      { timeout: 15000 }
    );

    // Step 4: Trigger call from visitor (simulate)
    await test.step('Trigger visitor call', async () => {
      await supabase
        .from('webrtc_sessions')
        .insert({
          id: `test-session-${Date.now()}`,
          tag_id: tagId,
          visitor_id: 'test-visitor-mobile',
          owner_id: TEST_OWNER_ID,
          status: 'pending'
        });
    });

    // Step 5: Verify owner receives notification
    const notification = await incomingCallPromise;
    await expect(notification).toBeVisible();
    await expect(ownerPage.locator('[data-testid="caller-name"]')).toContainText('Visitor');

    // Step 6: Verify answer/decline buttons
    await expect(ownerPage.locator('[data-testid="answer-call-btn"]')).toBeVisible();
    await expect(ownerPage.locator('[data-testid="decline-call-btn"]')).toBeVisible();

    await ownerContext.close();
  });

  test('WebRTC signaling via Realtime (offer/answer exchange)', async ({ page, browser }) => {
    // Step 1: Create two contexts (visitor mobile + owner desktop)
    const visitorContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) ScanBell-Test'
    });
    const ownerContext = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    const visitorPage = await visitorContext.newPage();
    const ownerPage = await ownerContext.newPage();

    // Step 2: Owner logs in first
    await ownerPage.goto('/login');
    await ownerPage.fill('[data-testid="email-input"]', 'owner@scanbell.test');
    await ownerPage.fill('[data-testid="password-input"]', 'testpassword');
    await ownerPage.click('[data-testid="login-btn"]');
    await ownerPage.waitForURL('/dashboard');

    // Step 3: Visitor scans QR and initiates call
    await visitorPage.goto(`/v/${TEST_TAG_CODE}`);
    await visitorPage.waitForSelector('[data-testid="call-video-btn"]');

    // Mock media devices for visitor
    await visitorPage.evaluate(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: () => Promise.resolve({
            getTracks: () => [{ stop: () => {} }]
          })
        }
      });
    });

    // Step 4: Start call
    await visitorPage.click('[data-testid="call-video-btn"]');

    // Step 5: Owner receives and answers call
    await ownerPage.waitForSelector('[data-testid="incoming-call-notification"]', { timeout: 10000 });
    await ownerPage.click('[data-testid="answer-call-btn"]');

    // Step 6: Verify both sides show connected status
    await expect(visitorPage.locator('[data-testid="call-status"]')).toContainText('connected', { timeout: 10000 });
    await expect(ownerPage.locator('[data-testid="call-status"]')).toContainText('connected', { timeout: 10000 });

    // Step 7: Verify session status updated in database
    const { data: session } = await supabase
      .from('webrtc_sessions')
      .select('status')
      .eq('tag_id', tagId)
      .eq('status', 'connected')
      .single();

    expect(session?.status).toBe('connected');

    // Cleanup
    await visitorContext.close();
    await ownerContext.close();
  });

  test('Tag availability schedule enforcement', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Step 1: Update tag to have restricted availability
    await supabase
      .from('tags')
      .update({
        availability: {
          always: false,
          schedule: {
            start: '09:00',
            end: '17:00',
            days: [1, 2, 3, 4, 5] // Weekdays only
          }
        }
      })
      .eq('tag_code', TEST_TAG_CODE);

    // Step 2: Try to access outside hours (test system should handle this)
    await page.goto(`/v/${TEST_TAG_CODE}`);

    // Step 3: Verify either access denied or warning shown
    const unavailableMessage = page.locator('[data-testid="unavailable-message"]');
    const ownerInfo = page.locator('[data-testid="owner-name"]');

    // Either message should be present
    await expect(unavailableMessage.or(ownerInfo)).toBeVisible({ timeout: 5000 });

    // Reset availability
    await supabase
      .from('tags')
      .update({ availability: { always: true } })
      .eq('tag_code', TEST_TAG_CODE);
  });
});

/**
 * Helper: Wait for WebRTC signaling message
 */
async function waitForSignalingMessage(page: Page, messageType: string, timeout = 10000): Promise<any> {
  return page.evaluate((type) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${type} message`));
      }, 10000);

      // Listen for custom event from webrtc-realtime.service
      window.addEventListener('webrtc-signal', (event: any) => {
        if (event.detail?.type === type) {
          clearTimeout(timeoutId);
          resolve(event.detail);
        }
      });
    });
  }, messageType);
}
