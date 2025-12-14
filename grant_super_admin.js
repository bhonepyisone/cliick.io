#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function grantSuperAdmin() {
    try {
        console.log('🔐 Starting super admin grant process...\n');

        const userIds = [
            '27446426-0afa-43dd-942c-bffde36ab7fa', // yvsa
            'd89c0671-8aa2-4306-bec1-704e7aecb0c6', // vozz
        ];

        // Step 1: Check if is_admin column exists
        console.log('Step 1️⃣ : Checking if is_admin column exists...');
        const { error: checkError } = await supabase
            .from('profiles')
            .select('is_admin')
            .limit(1);

        if (checkError && checkError.message.includes('is_admin')) {
            console.log('❌ is_admin column does not exist. Adding it now...');
            
            // Try to add the column via RPC or direct SQL
            const { error: addColError } = await supabase
                .rpc('exec', {
                    sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;'
                })
                .catch(() => ({ error: null }));

            console.log('✅ Column addition attempted (may already exist)');
        } else {
            console.log('✅ is_admin column exists');
        }

        // Step 2: Grant super admin to both users
        console.log('\nStep 2️⃣ : Granting super admin status...');
        
        for (const userId of userIds) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ is_admin: true })
                .eq('id', userId);

            if (updateError) {
                console.error(`❌ Error updating ${userId}:`, updateError.message);
            } else {
                console.log(`✅ User ${userId} granted super admin`);
            }
        }

        // Step 3: Verify the changes
        console.log('\nStep 3️⃣ : Verifying super admin status...');
        const { data: admins, error: verifyError } = await supabase
            .from('profiles')
            .select('id, username, email, is_admin')
            .in('id', userIds);

        if (verifyError) {
            console.error('❌ Error verifying:', verifyError.message);
        } else {
            console.log('✅ Current super admins:');
            admins.forEach(admin => {
                console.log(`   - ${admin.username} (${admin.email}): is_admin=${admin.is_admin}`);
            });
        }

        console.log('\n✨ Super admin grant process complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

grantSuperAdmin();
