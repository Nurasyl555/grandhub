#!/bin/sh
set -e

# Схему БД накатываем до старта сервера: init_db() только проверяет
# соединение и таблиц не создаёт, поэтому без этого шага любой запрос
# падает с "no such table".
#
# RUN_MIGRATIONS=0 выставляет celery-worker: миграции должен накатывать
# ровно один процесс, иначе два alembic-а дерутся за блокировку SQLite.
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
    echo "Running database migrations..."
    alembic upgrade head
else
    echo "Skipping migrations (RUN_MIGRATIONS=0)"
fi

exec "$@"
