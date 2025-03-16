import { supabase } from '../config/supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '20240101_add_report_actions.sql'), 'utf8');
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) throw error;
        console.log('Migration applied successfully');
    } catch (error) {
        console.error('Error applying migration:', error);
    }
}

applyMigration();