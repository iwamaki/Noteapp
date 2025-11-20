# @file base.py
# @summary SQLAlchemy Base definition
# @responsibility すべてのエンティティで共有されるBase定義

from sqlalchemy.ext.declarative import declarative_base

# すべてのエンティティで共有されるBase
Base = declarative_base()
