/**
 * WebRTC Signaling Service - Supabase Realtime Implementation
 * Remplace Socket.IO par Supabase Realtime pour le signaling P2P
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import { createLogger } from './utils/logger';

const logger = createLogger('WebRTCRealtimeService');

// Types for WebRTC signaling
interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'reject';
  payload: any;
  from: string;
  to: string;
  sessionId: string;
  timestamp: number;
}

interface WebRTCSession {
  id: string;
  tagId: string;
  visitorId: string;
  ownerId: string;
  status: 'pending' | 'connected' | 'rejected' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

class WebRTCRealtimeService extends EventEmitter {
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();
  private sessions: Map<string, WebRTCSession> = new Map();
  private userId: string | null = null;

  constructor() {
    super();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize service with authenticated user
   */
  async initialize(): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (user) {
      this.userId = user.id;
      this.subscribeToSignals();
    }
  }

  /**
   * Subscribe to signaling channel for this user
   */
  private subscribeToSignals(): void {
    if (!this.userId) return;

    const channel = this.supabase
      .channel(`webrtc:${this.userId}`)
      .on('broadcast', { event: 'signal' }, (payload: { payload: SignalMessage }) => {
        this.handleSignal(payload.payload);
      })
      .subscribe();

    this.channels.set(this.userId, channel);
  }

  /**
   * Create new WebRTC session
   */
  async createSession(tagId: string, visitorId: string, ownerId: string): Promise<WebRTCSession> {
    const sessionId = `${tagId}-${Date.now()}`;
    
    const session: WebRTCSession = {
      id: sessionId,
      tagId,
      visitorId,
      ownerId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);

    // Store in Supabase for persistence
    await this.supabase.from('webrtc_sessions').insert({
      id: sessionId,
      tag_id: tagId,
      visitor_id: visitorId,
      owner_id: ownerId,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    this.emit('sessionCreated', session);
    return session;
  }

  /**
   * Send WebRTC offer to owner
   */
  async sendOffer(sessionId: string, ownerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const message: SignalMessage = {
      type: 'offer',
      payload: offer,
      from: this.userId || 'visitor',
      to: ownerId,
      sessionId,
      timestamp: Date.now()
    };

    await this.broadcastSignal(ownerId, message);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'pending';
      session.updatedAt = new Date();
    }
  }

  /**
   * Send WebRTC answer to visitor
   */
  async sendAnswer(sessionId: string, visitorId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const message: SignalMessage = {
      type: 'answer',
      payload: answer,
      from: this.userId || 'owner',
      to: visitorId,
      sessionId,
      timestamp: Date.now()
    };

    await this.broadcastSignal(visitorId, message);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'connected';
      session.updatedAt = new Date();
    }
  }

  /**
   * Send ICE candidate to peer
   */
  async sendIceCandidate(sessionId: string, targetId: string, candidate: RTCIceCandidate): Promise<void> {
    const message: SignalMessage = {
      type: 'ice-candidate',
      payload: candidate,
      from: this.userId || 'unknown',
      to: targetId,
      sessionId,
      timestamp: Date.now()
    };

    await this.broadcastSignal(targetId, message);
  }

  /**
   * Reject incoming call
   */
  async rejectSession(sessionId: string, visitorId: string): Promise<void> {
    const message: SignalMessage = {
      type: 'reject',
      payload: { reason: 'rejected' },
      from: this.userId || 'owner',
      to: visitorId,
      sessionId,
      timestamp: Date.now()
    };

    await this.broadcastSignal(visitorId, message);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'rejected';
      session.updatedAt = new Date();
    }

    await this.updateSessionStatus(sessionId, 'rejected');
  }

  /**
   * End active session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const targetId = session.ownerId === this.userId ? session.visitorId : session.ownerId;

    const message: SignalMessage = {
      type: 'leave',
      payload: {},
      from: this.userId || 'unknown',
      to: targetId,
      sessionId,
      timestamp: Date.now()
    };

    await this.broadcastSignal(targetId, message);
    
    session.status = 'ended';
    session.updatedAt = new Date();
    
    await this.updateSessionStatus(sessionId, 'ended');
    this.emit('sessionEnded', session);
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): WebRTCSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Cleanup service
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up WebRTCRealtimeService', { sessionsCount: this.sessions.size });
    
    // End all active sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'connected') {
        await this.endSession(sessionId);
      }
    }

    // Unsubscribe from all channels
    for (const [userId, channel] of this.channels.entries()) {
      await this.supabase.removeChannel(channel);
    }
    this.channels.clear();
    this.sessions.clear();
    
    // Remove all event listeners
    this.removeAllListeners();
    
    logger.info('WebRTCRealtimeService cleanup completed');
  }

  /**
   * Alias for cleanup() - for consistent API across services
   */
  async destroy(): Promise<void> {
    return this.cleanup();
  }

  /**
   * Broadcast signal via Supabase Realtime
   */
  private async broadcastSignal(targetId: string, message: SignalMessage): Promise<void> {
    await this.supabase.channel(`webrtc:${targetId}`).send({
      type: 'broadcast',
      event: 'signal',
      payload: message
    });
  }

  /**
   * Handle incoming signal
   */
  private handleSignal(message: SignalMessage): void {
    const { type, sessionId } = message;

    switch (type) {
      case 'offer':
        this.emit('offerReceived', message);
        break;
      case 'answer':
        this.emit('answerReceived', message);
        break;
      case 'ice-candidate':
        this.emit('iceCandidateReceived', message);
        break;
      case 'reject':
        this.sessions.set(sessionId, { 
          ...this.sessions.get(sessionId)!, 
          status: 'rejected' 
        });
        this.emit('sessionRejected', message);
        break;
      case 'leave':
        this.sessions.set(sessionId, { 
          ...this.sessions.get(sessionId)!, 
          status: 'ended' 
        });
        this.emit('peerDisconnected', message);
        break;
    }
  }

  /**
   * Update session status in database
   */
  private async updateSessionStatus(sessionId: string, status: string): Promise<void> {
    await this.supabase
      .from('webrtc_sessions')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', sessionId);
  }
}

export default WebRTCRealtimeService;
export { WebRTCRealtimeService, SignalMessage, WebRTCSession };
