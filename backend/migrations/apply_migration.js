import { supabase } from '../config/supabaseClient.js';

async function applyMigration() {
    try {
        const { error } = await supabase.from('notifications')
            .rpc('add_updated_at_column', {
                sql: `
                    ALTER TABLE notifications 
                    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
                `
            });

        if (error) throw error;
        console.log('Migration applied successfully');
    } catch (error) {
        console.error('Error applying migration:', error);
    }
}

applyMigration();