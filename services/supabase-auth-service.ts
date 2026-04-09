import { createServerClient } from '@supabase/supabase-js';
import * as speakeasy from 'speakeasy';
import type { User, DeviceInfo, AuthResponse } from '../types/models';

// Service d'authentification utilisant exclusivement Supabase Auth
class SupabaseAuthService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
  }

  private getClient() {
    return createServerClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const supabase = this.getClient();
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'OWNER'
        }
      }
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('User registration failed');
    }

    // L'utilisateur est automatiquement créé dans public.users via trigger
    const user: User = {
      id: authData.user.id,
      email: authData.user.email!,
      name: name,
      role: 'OWNER',
      two_factor_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return { user };
  }

  /**
   * Connexion utilisateur
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const supabase = this.getClient();
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw new Error('Invalid credentials');
    }

    if (!authData.user) {
      throw new Error('Login failed');
    }

    // Récupérer les données utilisateur depuis la table public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      throw new Error('User data not found');
    }

    // Vérifier si 2FA est activé
    if (userData.two_factor_enabled) {
      return {
        user: userData as User,
        requiresTwoFactor: true,
        tempToken: authData.session?.access_token
      };
    }

    return {
      user: userData as User,
      session: {
        id: authData.session?.refresh_token || '',
        token: authData.session?.access_token || '',
        refresh_token: authData.session?.refresh_token || '',
        expires_at: new Date(authData.session?.expires_at || '').toISOString(),
        user_id: authData.user.id,
        device_info: {},
        is_valid: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
  }

  /**
   * Déconnexion
   */
  async logout(token: string): Promise<void> {
    const supabase = this.getClient();
    await supabase.auth.signOut();
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const supabase = this.getClient();
    
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      throw new Error('Token refresh failed');
    }

    return {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token
    };
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  async verifyAuth(token: string): Promise<User | null> {
    const supabase = this.getClient();
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Récupérer les données complètes
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return userData as User || null;
  }

  /**
   * Activer la 2FA (TOTP) avec QR code pour Google Authenticator
   */
  async enableTwoFactor(userId: string, method: 'totp' | 'sms' | 'email' = 'totp') {
    const supabase = this.getClient();
    
    // Générer un secret TOTP avec speakeasy (compatible Google Authenticator)
    const secret = speakeasy.generateSecret({
      name: 'ScanBell',
      length: 32
    });
    
    // Récupérer l'email de l'utilisateur pour l'URL otpauth
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    
    // Générer l'URL pour QR code
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: userData?.email || 'user',
      issuer: 'ScanBell',
      encoding: 'base32'
    });
    
    // Sauvegarder le secret
    const { error } = await supabase
      .from('users')
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret.base32,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw new Error('Failed to enable 2FA');
    }

    // Générer les codes de secours (hashed)
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32,
      qrCodeUrl: otpauthUrl,
      backupCodes
    };
  }

  /**
   * Vérifier le code 2FA avec speakeasy
   */
  async verifyTwoFactor(userId: string, code: string, providedSecret?: string): Promise<boolean> {
    const supabase = this.getClient();
    
    // Si un secret est fourni (première vérification), l'utiliser
    // Sinon, récupérer depuis la DB
    let secret = providedSecret;
    
    if (!secret) {
      const { data, error } = await supabase
        .from('users')
        .select('two_factor_secret')
        .eq('id', userId)
        .single();
      
      if (error || !data?.two_factor_secret) {
        return false;
      }
      
      secret = data.two_factor_secret;
    }
    
    // Vérifier le code TOTP avec speakeasy
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 steps time drift
    });
    
    return verified;
  }

  /**
   * Désactiver la 2FA
   */
  async disableTwoFactor(userId: string): Promise<void> {
    const supabase = this.getClient();
    
    const { error } = await supabase
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw new Error('Failed to disable 2FA');
    }
  }

  /**
   * Récupérer les codes de secours
   */
  async getBackupCodes(userId: string): Promise<string[]> {
    const supabase = this.getClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('backup_codes')
      .eq('id', userId)
      .single();

    if (error) {
      return [];
    }

    return data?.backup_codes || [];
  }

  /**
   * Régénérer les codes de secours
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const supabase = this.getClient();
    const newCodes = this.generateBackupCodes();
    
    const { error } = await supabase
      .from('users')
      .update({
        backup_codes: newCodes,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw new Error('Failed to regenerate backup codes');
    }

    return newCodes;
  }

  /**
   * Vérifier un code de secours
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const supabase = this.getClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('backup_codes')
      .eq('id', userId)
      .single();
    
    if (error || !data?.backup_codes) {
      return false;
    }
    
    const validCodes = data.backup_codes as string[];
    const codeIndex = validCodes.indexOf(code.toUpperCase());
    
    if (codeIndex === -1) {
      return false;
    }
    
    // Remove used backup code
    validCodes.splice(codeIndex, 1);
    
    await supabase
      .from('users')
      .update({ backup_codes: validCodes })
      .eq('id', userId);
    
    return true;
  }

  // Helpers
  private generateBackupCodes(): string[] {
    // Générer 10 codes de secours aléatoires de 8 caractères
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars
    
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }
    return codes;
  }
}

export const supabaseAuthService = new SupabaseAuthService();
