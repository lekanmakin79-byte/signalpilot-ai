from datetime import datetime, timezone

from fastapi import APIRouter
from sqlmodel import Session, select

from ..database import TradingControl, engine


router = APIRouter(
    prefix="/trading-control",
    tags=["Trading Control"],
)


CONTROL_NAME = "paper_trading"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_or_create_control(
    session: Session,
) -> TradingControl:
    control = session.exec(
        select(TradingControl).where(
            TradingControl.name == CONTROL_NAME
        )
    ).first()

    if control is None:
        control = TradingControl(
            name=CONTROL_NAME,
            enabled=True,
            reason=None,
            updated_at=_utc_now(),
        )

        session.add(control)
        session.commit()
        session.refresh(control)

    return control


@router.get("/status")
async def get_trading_control_status():
    with Session(engine) as session:
        control = _get_or_create_control(session)

        return {
            "success": True,
            "enabled": control.enabled,
            "status": (
                "RUNNING"
                if control.enabled
                else "STOPPED"
            ),
            "reason": control.reason,
            "updated_at": control.updated_at,
        }


@router.post("/stop")
async def stop_automated_trading():
    with Session(engine) as session:
        control = _get_or_create_control(session)

        control.enabled = False
        control.reason = "Automated trading stopped by operator."
        control.updated_at = _utc_now()

        session.add(control)
        session.commit()
        session.refresh(control)

        return {
            "success": True,
            "enabled": False,
            "status": "STOPPED",
            "reason": control.reason,
            "updated_at": control.updated_at,
        }


@router.post("/start")
async def start_automated_trading():
    with Session(engine) as session:
        control = _get_or_create_control(session)

        control.enabled = True
        control.reason = None
        control.updated_at = _utc_now()

        session.add(control)
        session.commit()
        session.refresh(control)

        return {
            "success": True,
            "enabled": True,
            "status": "RUNNING",
            "reason": None,
            "updated_at": control.updated_at,
        }