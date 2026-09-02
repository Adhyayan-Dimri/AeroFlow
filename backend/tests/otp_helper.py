import os

def test_otp(reg_response: dict | None = None) -> str:
    if reg_response and reg_response.get("dev_otp"):
        return reg_response["dev_otp"]
    raw = os.environ.get("TEST_OTP")
    if not raw:
        raise RuntimeError("TEST_OTP env var required for auth tests")
    return f"{int(raw.strip()) % 1000000:06d}"
