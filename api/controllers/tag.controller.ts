import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { createLogger } from '../../services/utils/logger';

const logger = createLogger('TagController');

// Types for tag operations
interface TagFeatures {
  video: boolean;
  audio: boolean;
  message: boolean;
}

interface TagAvailability {
  always: boolean;
  schedule?: {
    start: string;
    end: string;
    days: number[];
  };
}

interface CreateTagRequest {
  name: string;
  propertyId: string;
  deviceId?: string;
  features?: Partial<TagFeatures>;
  availability?: Partial<TagAvailability>;
  settings?: Record<string, any>;
  isPublic?: boolean;
}

interface UpdateTagRequest {
  name?: string;
  features?: Partial<TagFeatures>;
  availability?: Partial<TagAvailability>;
  settings?: Record<string, any>;
  isActive?: boolean;
  isPublic?: boolean;
}

// Generate unique tag code for QR/NFC
function generateTagCode(): string {
  // Generate 8-character alphanumeric code
  return randomBytes(4).toString('hex').toUpperCase();
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Tag Controller - Gestion des tags QR/NFC pour ScanBell
 * Architecture: Supabase Cloud avec RLS
 */
export class TagController {
  /**
   * GET /api/tags/scan/:tagId
   * Public endpoint - Called by visitor after scanning QR/NFC
   */
  async getTagInfo(req: Request, res: Response): Promise<void> {
    try {
      const { tagId } = req.params;
      const supabase = getSupabaseClient();
      
      // Find tag by code
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .select(`
          *,
          property:property_id (
            id,
            name,
            owner_id
          )
        `)
        .eq('tag_code', tagId)
        .eq('is_active', true)
        .single();
      
      if (tagError || !tag) {
        res.status(404).json({ error: 'Tag not found or inactive' });
        return;
      }
      
      // Get owner info (limited data for privacy)
      const { data: owner, error: ownerError } = await supabase
        .from('users')
        .select('id, name, avatar')
        .eq('id', tag.property.owner_id)
        .single();
      
      if (ownerError || !owner) {
        res.status(404).json({ error: 'Owner not found' });
        return;
      }
      
      // Check availability
      const isAvailable = this.checkAvailability(tag.availability);
      if (!isAvailable) {
        res.status(403).json({ error: 'Tag not available at this time' });
        return;
      }
      
      // Increment scan count
      await supabase
        .from('tags')
        .update({
          scan_count: (tag.scan_count || 0) + 1,
          last_scan_at: new Date().toISOString()
        })
        .eq('id', tag.id);
      
      // Return info to visitor
      res.json({
        tagId: tag.id,
        tagCode: tag.tag_code,
        owner: {
          id: owner.id,
          name: owner.name,
          avatar: owner.avatar
        },
        property: {
          id: tag.property.id,
          name: tag.property.name
        },
        features: tag.features,
        availability: tag.availability
      });
      
    } catch (error) {
      logger.error('Error getting tag info', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * POST /api/tags
   * Create new tag (authenticated)
   */
  async createTag(req: Request, res: Response): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const userId = req.user?.id; // Set by auth middleware
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const {
        name,
        propertyId,
        deviceId,
        features,
        availability,
        settings,
        isPublic
      }: CreateTagRequest = req.body;
      
      // Verify user owns the property
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id, owner_id')
        .eq('id', propertyId)
        .eq('owner_id', userId)
        .single();
      
      if (propertyError || !property) {
        res.status(403).json({ error: 'You do not own this property' });
        return;
      }
      
      // Generate unique tag code
      let tagCode = generateTagCode();
      let codeExists = true;
      let attempts = 0;
      
      // Ensure unique code
      while (codeExists && attempts < 10) {
        const { data } = await supabase
          .from('tags')
          .select('id')
          .eq('tag_code', tagCode)
          .single();
        
        if (!data) {
          codeExists = false;
        } else {
          tagCode = generateTagCode();
          attempts++;
        }
      }
      
      // Create tag
      const { data: tag, error } = await supabase
        .from('tags')
        .insert({
          tag_code: tagCode,
          name,
          property_id: propertyId,
          device_id: deviceId,
          features: {
            video: true,
            audio: true,
            message: true,
            ...features
          },
          availability: {
            always: true,
            ...availability
          },
          settings: settings || {},
          is_public: isPublic !== false
        })
        .select()
        .single();
      
      if (error) {
        logger.error('Error creating tag', { error: error.message });
        res.status(500).json({ error: 'Failed to create tag' });
        return;
      }
      
      res.status(201).json({
        id: tag.id,
        tagCode: tag.tag_code,
        name: tag.name,
        qrUrl: `${process.env.NEXT_PUBLIC_APP_URL}/v/${tag.tag_code}`,
        features: tag.features,
        createdAt: tag.created_at
      });
      
    } catch (error) {
      logger.error('Error creating tag', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * GET /api/tags/my-tags
   * List all tags for authenticated user's properties
   */
  async getMyTags(req: Request, res: Response): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Get tags for user's properties (RLS handles filtering)
      const { data: tags, error } = await supabase
        .from('tags')
        .select(`
          *,
          property:property_id (id, name, address),
          device:device_id (id, name, status)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Error fetching tags', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch tags' });
        return;
      }
      
      res.json(tags || []);
      
    } catch (error) {
      logger.error('Error fetching tags', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * GET /api/tags/:id
   * Get single tag details
   */
  async getTag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { data: tag, error } = await supabase
        .from('tags')
        .select(`
          *,
          property:property_id (id, name, address),
          device:device_id (id, name, status)
        `)
        .eq('id', id)
        .single();
      
      if (error || !tag) {
        res.status(404).json({ error: 'Tag not found' });
        return;
      }
      
      res.json(tag);
      
    } catch (error) {
      logger.error('Error fetching tag', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
  
  /**
   * PUT /api/tags/:id
   * Update tag
   */
  async updateTag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const updates: UpdateTagRequest = req.body;
      
      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.name) updateData.name = updates.name;
      if (updates.features) updateData.features = updates.features;
      if (updates.availability) updateData.availability = updates.availability;
      if (updates.settings) updateData.settings = updates.settings;
      if (typeof updates.isActive === 'boolean') updateData.is_active = updates.isActive;
      if (typeof updates.isPublic === 'boolean') updateData.is_public = updates.isPublic;
      
      const { data: tag, error } = await supabase
        .from('tags')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logger.error('Error updating tag', { error: error.message });
        return;
      }
      
      res.json(tag);
      
    } catch (error) {
      logger.error('Error updating tag', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * DELETE /api/tags/:id
   * Delete tag
   */
  async deleteTag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);
      
      if (error) {
        logger.error('Error deleting tag', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({ error: 'Failed to delete tag' });
        return;
      }
      
      res.status(204).send();
      
    } catch (error) {
      logger.error('Error deleting tag', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * GET /api/tags/:id/stats
   * Get tag statistics
   */
  async getTagStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const supabase = getSupabaseClient();
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Get tag with access logs
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .select('id, name, scan_count, last_scan_at, created_at')
        .eq('id', id)
        .single();
      
      if (tagError || !tag) {
        res.status(404).json({ error: 'Tag not found' });
        return;
      }
      
      // Get recent scans from access_logs
      const { data: recentScans, error: scansError } = await supabase
        .from('access_logs')
        .select('created_at, method, status')
        .eq('method', 'QR_CODE')
        .order('created_at', { ascending: false })
        .limit(30);
      
      res.json({
        tag: {
          id: tag.id,
          name: tag.name,
          totalScans: tag.scan_count,
          lastScanAt: tag.last_scan_at,
          createdAt: tag.created_at
        },
        recentActivity: recentScans || [],
        thisMonthScans: recentScans?.filter(
          s => new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length || 0
      });
      
    } catch (error) {
      logger.error('Error getting tag stats', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * GET /api/tags/my-tags/stats
   * Get aggregated stats for all user's tags
   */
  async getAllTagsStats(req: Request, res: Response): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Get all tags with stats
      const { data: tags, error } = await supabase
        .from('tags')
        .select('id, name, is_active, scan_count, last_scan_at, created_at');
      
      if (error) {
        logger.error('Error fetching tag stats', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch stats' });
        return;
      }
      
      const stats = {
        totalTags: tags?.length || 0,
        activeTags: tags?.filter(t => t.is_active).length || 0,
        totalScans: tags?.reduce((sum, t) => sum + (t.scan_count || 0), 0) || 0,
        mostUsed: tags?.sort((a, b) => (b.scan_count || 0) - (a.scan_count || 0))[0] || null,
        tags: tags || []
      };
      
      res.json(stats);
      
    } catch (error) {
      logger.error('Error getting all tag stats', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * PUT /api/tags/:id/settings
   * Update tag settings
   */
  async updateTagSettings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { settings } = req.body;
      const supabase = getSupabaseClient();
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { data: tag, error } = await supabase
        .from('tags')
        .update({
          settings: settings || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logger.error('Error updating tag settings', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({ error: 'Failed to update settings' });
        return;
      }
      
      res.json(tag);
      
    } catch (error) {
      logger.error('Error updating tag settings', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * PUT /api/tags/:id/availability
   * Update tag availability schedule
   */
  async updateAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { availability } = req.body;
      const supabase = getSupabaseClient();
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { data: tag, error } = await supabase
        .from('tags')
        .update({
          availability: availability || { always: true },
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logger.error('Error updating tag availability', { error: error instanceof Error ? error.message : 'Unknown error' });
        res.status(500).json({ error: 'Failed to update availability' });
        return;
      }
      
      res.json(tag);
      
    } catch (error) {
      logger.error('Error updating tag availability', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Helper: Check if tag is available based on schedule
  private checkAvailability(availability: any): boolean {
    if (!availability || availability.always === true) {
      return true;
    }
    
    if (availability.schedule) {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const schedule = availability.schedule;
      
      // Check day of week
      if (schedule.days && !schedule.days.includes(currentDay)) {
        return false;
      }
      
      // Check time
      if (schedule.start && schedule.end) {
        const [startHour, startMin] = schedule.start.split(':').map(Number);
        const [endHour, endMin] = schedule.end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        if (currentTime < startMinutes || currentTime > endMinutes) {
          return false;
        }
      }
    }
    
    return true;
  }
}

export default TagController;
