// JS/SUPABASE.js
// Configuração do Cliente Supabase via CDN / ES Modules

const SUPABASE_URL = "https://ghdtihuorjfrskywsffj.supabase.co";
const SUPABASE_KEY = "sb_publishable_ETjd801wnxEdlwqNEJeNwA_NIjBb2vd";

// Inicialização do cliente Supabase usando o objeto global carregado via CDN
// window.supabase é injetado pela CDN @supabase/supabase-js@2
export function getSupabaseClient() {
    if (!window.supabase) {
        throw new Error("Biblioteca Supabase não foi carregada no window.");
    }
    if (!window.supabaseInstance) {
        window.supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return window.supabaseInstance;
}

export { SUPABASE_URL, SUPABASE_KEY };
