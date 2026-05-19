from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from collections import defaultdict
from datetime import datetime
import models
from database import get_db

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats")
def get_admin_stats(month: Optional[str] = None, db: Session = Depends(get_db)):
    all_packages = db.query(models.Package).all()
    
    monthly_revenue_data = defaultdict(float)
    global_total_revenue = 0.0

    for p in all_packages:
        if p.is_paid:
            global_total_revenue += p.delivery_cost
            if p.created_at:
                m_key = p.created_at.strftime("%Y-%m")
                monthly_revenue_data[m_key] += p.delivery_cost

    monthly_revenue_chart = [{"month": k, "revenue": round(v, 2)} for k, v in sorted(monthly_revenue_data.items())]

    target_month = month or datetime.utcnow().strftime("%Y-%m")
    filtered = [p for p in all_packages if p.created_at and p.created_at.strftime("%Y-%m") == target_month]

    delivered = sum(1 for p in filtered if p.status == "delivered")
    pending = sum(1 for p in filtered if p.status == "pending")
    accepted = sum(1 for p in filtered if p.status == "accepted")
    
    month_revenue = round(monthly_revenue_data.get(target_month, 0.0), 2)

    total_clients = db.query(models.User).filter(models.User.role == "client").count()
    total_couriers = db.query(models.User).filter(models.User.role == "courier").count()
    
    return {
        "kpis": {
            "total_packages": len(filtered),
            "revenue": round(global_total_revenue, 2),
            "revenue_current_month": month_revenue,
            "clients": total_clients,
            "couriers": total_couriers
        },
        "status_distribution": [
            {"name": "Oczekujące", "value": pending},
            {"name": "W drodze", "value": accepted},
            {"name": "Dostarczone", "value": delivered}
        ],
        "monthly_revenue": monthly_revenue_chart
    }
