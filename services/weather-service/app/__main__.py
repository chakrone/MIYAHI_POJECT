"""Allow running as `python -m app`"""
import uvicorn
from app.main import app, API_HOST, API_PORT

uvicorn.run(app, host=API_HOST, port=API_PORT)
