from functools import lru_cache

from app.config import settings
from app.market.cache import MemoryQuoteCache, SupabaseQuoteCache
from app.market.service import QuoteService, memory_quote_cache


@lru_cache
def get_quote_service() -> QuoteService:
    cache: MemoryQuoteCache | SupabaseQuoteCache
    if settings.supabase_configured:
        cache = SupabaseQuoteCache(settings.supabase_url, settings.supabase_service_role_key)
    else:
        cache = memory_quote_cache
    return QuoteService(
        cache,
        ttl_seconds=settings.quote_cache_ttl_seconds,
        alpha_vantage_key=settings.alpha_vantage_key_or_none,
    )
