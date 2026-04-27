from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    opnsense_base_url: str
    opnsense_api_key: str
    opnsense_api_secret: str
    opnsense_ca_bundle_path: str | None = None
    opnsense_insecure_skip_verify: bool = False

    admin_token: str

    alias_allowed_ips: str = "PARENT_DASH_ALLOWED_IPS"
    alias_blocked_ips: str = "PARENT_DASH_BLOCKED_IPS"
    alias_site_block_domains: str = "PARENT_DASH_BLOCKED_DOMAINS"

    # Optional: comma-separated UUIDs of DNSBL lists to enable for "family mode"
    family_dnsbl_uuids: str | None = None
    dnsbl_exception_uuid: str | None = None

    # OPNsense Firewall Automation rule UUIDs (optional, for toggles)
    internet_kill_rule_uuid: str | None = None
    guest_mute_rule_uuid: str | None = None
    bedtime_rule_uuid: str | None = None

    database_url: str


settings = Settings()  # type: ignore[call-arg]

