from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import BlacklistedAccount
from app.config import settings

def unban_user(username):
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    user = session.query(BlacklistedAccount).filter_by(username=username).first()
    
    if user:
        session.delete(user)
        session.commit()
        print(f"✅ Removed @{username} from blacklist.")
    else:
        print(f"User @{username} was not in blacklist.")
    
    session.close()

if __name__ == "__main__":
    unban_user("diningwithdamian")
