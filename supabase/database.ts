// supabase/database.ts
import { supabase } from './client';
import { Shop, Item, FormSubmission } from '../types';

// NOTE: All these functions rely on Supabase Row Level Security (RLS) being enabled
// on your tables. This is CRITICAL for a multi-tenant application to ensure
// users can only access their own data.

// Example: Get a single shop if the user has access.
export const getShopById = async (shopId: string): Promise<Shop | null> => {
    // RLS policy on the 'shops' table should prevent unauthorized access.
    const { data, error } = await supabase
        .from('shops')
        .select(`
            *,
            items ( * ),
            forms ( * ),
            formSubmissions ( * ),
            keywordReplies ( * ),
            savedReplies ( * ),
            paymentMethods ( * ),
            liveConversations ( * )
        `) // This fetches the shop and all its related data in one go.
        .eq('id', shopId)
        .single(); // Use .single() because we expect only one result for a given ID.

    if (error) {
        console.error('Supabase error fetching shop:', error.message);
        return null;
    }
    // The fetched data will need careful mapping to match the deeply nested structure of the 'Shop' type.
    // This is a simplified cast; a real implementation might need a dedicated mapping function.
    return data as unknown as Shop;
};

// Example: Get a list of shops the current user is a member of.
// This requires a 'team_members' table with 'user_id' and 'shop_id' columns.
export const getShopListForUser = async (): Promise<Pick<Shop, 'id' | 'name' | 'logoUrl'>[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    // RLS on 'team_members' should ensure a user can only query their own memberships.
    const { data, error } = await supabase
        .from('team_members')
        .select('shops ( id, name, logoUrl )') // Fetch related data from the 'shops' table.
        .eq('user_id', user.id);

    if (error) {
        console.error('Supabase error fetching shop list:', error.message);
        return [];
    }
    // The result from Supabase is shaped like [{ shops: {...} }, { shops: {...} }].
    // We need to extract the 'shops' object from each item in the array.
    return (data || []).map(item => item.shops).filter(Boolean) as Pick<Shop, 'id' | 'name' | 'logoUrl'>[];
};

// Example: Save (insert or update) a shop's data. RLS policies will control if this is allowed.
export const saveShop = async (shopData: Shop): Promise<Shop | null> => {
    // IMPORTANT: Supabase JS v2 doesn't handle deep nested upserts automatically.
    // A real implementation would require separate upsert operations for each related table 
    // (items, forms, etc.) or using a custom database function (RPC) for atomicity.
    // For this preparatory file, we'll just upsert the main shop data as a demonstration.
    
    const { team, items, forms, formSubmissions, /*...other nested arrays*/ ...shopCoreData } = shopData;

    // FIX: Pass an array to `upsert` to resolve TypeScript overload issues when types are not perfectly inferred.
    const { data, error } = await supabase
        .from('shops')
        .upsert([shopCoreData])
        .select()
        .single();
    
    if (error) {
        console.error('Supabase error saving shop:', error.message);
        return null;
    }

    // In a real application, you would now loop through and upsert related data. For example:
    // if (items && items.length > 0) { 
    //     const { error: itemError } = await supabase.from('items').upsert(items);
    //     if(itemError) console.error('Error saving items:', itemError.message);
    // }
    // ...and so on for forms, keywordReplies, etc.

    return data as Shop;
};
