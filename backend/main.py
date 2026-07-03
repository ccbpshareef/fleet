from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Fleet import router as fleet_router

app = FastAPI(title="Fleet Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fleet_router)
