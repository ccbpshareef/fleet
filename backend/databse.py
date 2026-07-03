import json
import threading
import time

import mysql.connector

from helpers import logger


class DatabaseConfig:
    HOST = "65.109.71.75"
    USERNAME = "pyth_db_cred"
    PASSWORD = "6HzXou8t?973g@768n"
    DATABASE = "pyth_db_cred"
    CREDENTIALS_QUERY = "SELECT data FROM jnp_credentials WHERE name LIKE '%mysql_prod%'"
    CONNECT_TIMEOUT = 15
    CONNECT_RETRIES = 2

class DatabaseService:
    _thread_local = threading.local()
    _credential_cache = None
    _credential_cache_timestamp = None
    _credential_cache_ttl = 300

    @staticmethod
    def _get_thread_connection():
        return getattr(DatabaseService._thread_local, "connection", None)

    @staticmethod
    def _set_thread_connection(connection):
        DatabaseService._thread_local.connection = connection

    @staticmethod
    def _clear_connection_cache():
        connection = DatabaseService._get_thread_connection()
        if connection:
            try:
                connection.close()
            except Exception:
                pass
        DatabaseService._set_thread_connection(None)

    @staticmethod
    def is_managed_connection(connection):
        return connection is DatabaseService._get_thread_connection()

    @staticmethod
    def _connect_kwargs(credentials: dict) -> dict:
        kwargs = dict(credentials)
        kwargs.setdefault("connection_timeout", DatabaseConfig.CONNECT_TIMEOUT)
        return kwargs

    @staticmethod
    def _load_database_credentials():
        temp_connection = None
        temp_cursor = None
        try:
            temp_connection = mysql.connector.connect(
                host=DatabaseConfig.HOST,
                user=DatabaseConfig.USERNAME,
                password=DatabaseConfig.PASSWORD,
                database=DatabaseConfig.DATABASE,
                connection_timeout=DatabaseConfig.CONNECT_TIMEOUT,
            )
            temp_cursor = temp_connection.cursor()
            temp_cursor.execute(DatabaseConfig.CREDENTIALS_QUERY)
            result = temp_cursor.fetchone()
            if result:
                return json.loads(result[0])
            raise Exception("Database credentials not found")
        finally:
            if temp_cursor:
                temp_cursor.close()
            if temp_connection and temp_connection.is_connected():
                temp_connection.close()

    @staticmethod
    def get_connection():
        """Get a per-thread reusable database connection using cached credentials."""
        last_error = None
        for attempt in range(DatabaseConfig.CONNECT_RETRIES + 1):
            try:
                current_connection = DatabaseService._get_thread_connection()
                if current_connection is not None:
                    try:
                        if current_connection.is_connected():
                            current_connection.ping(reconnect=True, attempts=1, delay=0)
                            return current_connection
                    except Exception:
                        pass
                    DatabaseService._clear_connection_cache()

                current_time = time.time()
                if (
                    DatabaseService._credential_cache is None
                    or DatabaseService._credential_cache_timestamp is None
                    or (current_time - DatabaseService._credential_cache_timestamp)
                    > DatabaseService._credential_cache_ttl
                ):
                    DatabaseService._credential_cache = DatabaseService._load_database_credentials()
                    DatabaseService._credential_cache_timestamp = current_time

                creds = DatabaseService._credential_cache
                host = creds.get("host", "unknown")
                connection = mysql.connector.connect(**DatabaseService._connect_kwargs(creds))
                DatabaseService._set_thread_connection(connection)
                return connection
            except Exception as e:
                last_error = e
                DatabaseService._clear_connection_cache()
                if attempt < DatabaseConfig.CONNECT_RETRIES:
                    target_host = (
                        (DatabaseService._credential_cache or {}).get("host")
                        or DatabaseConfig.HOST
                    )
                    logger(
                        f"Database connection error to {target_host}: {e}; "
                        f"retrying ({attempt + 1}/{DatabaseConfig.CONNECT_RETRIES})"
                    )
                    time.sleep(1)
                    continue
                logger(f"Database connection error: {e}")
                return None
        logger(f"Database connection error: {last_error}")
        return None

    @staticmethod
    def execute_query(query: str, params: tuple = None, fetch_all: bool = True):
        """Execute a database query with proper connection management."""

        def _run_once():
            connection = None
            cursor = None
            try:
                connection = DatabaseService.get_connection()
                if not connection:
                    raise Exception("Database connection failed")

                try:
                    connection.ping(reconnect=True, attempts=1, delay=0)
                except Exception:
                    DatabaseService._clear_connection_cache()
                    connection = DatabaseService.get_connection()
                    if not connection:
                        raise Exception("Database reconnection failed")

                cursor = connection.cursor(dictionary=True)
                cursor.execute(query, params or ())
                return cursor.fetchall() if fetch_all else cursor.fetchone()
            finally:
                if cursor:
                    cursor.close()
                if connection and not DatabaseService.is_managed_connection(connection):
                    try:
                        if connection.is_connected():
                            connection.close()
                    except Exception:
                        pass

        try:
            return _run_once()
        except Exception as e:
            msg = str(e).lower()
            if (
                "2013" in msg
                or "2006" in msg
                or "2003" in msg
                or "10060" in msg
                or "can't connect" in msg
                or "lost connection to mysql server" in msg
                or "server has gone away" in msg
            ):
                logger(f"MySQL transient error; retrying once: {e}")
                DatabaseService._clear_connection_cache()
                return _run_once()
            logger(f"Query execution error: {e}")
            raise
