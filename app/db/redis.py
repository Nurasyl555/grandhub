import logging

from upstash_redis.asyncio import Redis
from app.core.config import settings

logger = logging.getLogger(__name__)

token_blocklist = Redis(
    url=settings.UPSTASH_REDIS_REST_URL,
    token=settings.UPSTASH_REDIS_REST_TOKEN
)

JTI_EXPIRY = 3600

async def add_jti_to_blocklist(jti: str) -> None:
    try:
        await token_blocklist.set(jti, "", ex=JTI_EXPIRY)
    except Exception:
        logger.exception("Redis unavailable — could not blocklist token %s", jti)

async def token_in_blocklist(jti: str) -> bool:
    # Redis (Upstash) недоступен — не роняем все авторизованные запросы 500-й
    # ошибкой из-за него. Отзыв токена в этом случае просто не сработает,
    # но остальной API продолжает работать.
    try:
        value = await token_blocklist.get(jti)
        return value is not None
    except Exception:
        logger.exception("Redis unavailable — treating token as not blocklisted")
        return False


# Admin
[
    "adding users",
    "change roles",
    "crud on users",
    "crud on reviews",
    "revoking access"
]

# Users
[
    "crud on their own book submissions",
    "crud on their reviews",
    "crud on their own accounts"
]