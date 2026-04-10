/**
 * Edge Function: cleanup-visitor-files
 * Tâche planifiée (Cron) pour nettoyer les fichiers visiteurs vieux de plus de 7 jours
 * 
 * Schedule: 0 2 * * 0 (Tous les dimanches à 2h du matin)
 * ou via Supabase Cron Jobs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CleanupResult {
  deletedFiles: number;
  deletedPaths: string[];
  errors: string[];
}

serve(async (req: Request) => {
  try {
    // Vérifier l'autorisation (header secret ou IP allowlist)
    const authHeader = req.headers.get('Authorization');
    const expectedSecret = Deno.env.get('CRON_SECRET_KEY');
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      // Allow local development without secret
      const isLocal = !Deno.env.get('SUPABASE_URL')?.includes('supabase.co');
      if (!isLocal) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Initialiser Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: CleanupResult = {
      deletedFiles: 0,
      deletedPaths: [],
      errors: []
    };

    // 1. Récupérer les fichiers expirés (plus de 7 jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: expiredFiles, error: fetchError } = await supabase
      .from('visitor_message_files')
      .select('id, storage_path, created_at')
      .lt('expires_at', sevenDaysAgo.toISOString())
      .limit(100); // Batch processing

    if (fetchError) {
      console.error('Error fetching expired files:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired files' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredFiles || expiredFiles.length === 0) {
      console.log('No expired files to clean up');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired files to clean up',
          result: { deletedFiles: 0, deletedPaths: [], errors: [] }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredFiles.length} expired files to clean up`);

    // 2. Supprimer les fichiers du Storage
    for (const file of expiredFiles) {
      try {
        // Supprimer du bucket
        const { error: storageError } = await supabase
          .storage
          .from('visitor-messages')
          .remove([file.storage_path]);

        if (storageError) {
          console.error(`Failed to delete storage file ${file.storage_path}:`, storageError);
          result.errors.push(`Storage delete failed: ${file.storage_path}`);
          continue;
        }

        // Supprimer de la table de métadonnées
        const { error: dbError } = await supabase
          .from('visitor_message_files')
          .delete()
          .eq('id', file.id);

        if (dbError) {
          console.error(`Failed to delete DB record ${file.id}:`, dbError);
          result.errors.push(`DB delete failed: ${file.id}`);
          continue;
        }

        result.deletedFiles++;
        result.deletedPaths.push(file.storage_path);
        console.log(`Deleted: ${file.storage_path}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing file ${file.storage_path}:`, errorMsg);
        result.errors.push(`Processing error: ${file.storage_path} - ${errorMsg}`);
      }
    }

    // 3. Logger le résultat
    console.log('Cleanup completed:', {
      deletedFiles: result.deletedFiles,
      errors: result.errors.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleanup completed: ${result.deletedFiles} files deleted`,
        result,
        processedAt: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
