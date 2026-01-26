from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import BlacklistedAccount
from app.config import settings

def check_reason(username):
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    user = session.query(BlacklistedAccount).filter_by(username=username).first()
    
    if user:
        print(f"❌ User: @{user.username}")
        print(f"📄 Reason: {user.reason}")
        print(f"🛑 Failed Filters: {user.failed_filters}")
    else:
        print(f"User @{username} is not in the blacklist.")
    
    session.close()

if __name__ == "__main__":
    check_reason("diningwithdamian")
