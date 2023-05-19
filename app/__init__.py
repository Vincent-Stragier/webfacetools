from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy

socketio = SocketIO()

from app.main import main as main_blueprint

app = Flask(__name__, instance_relative_config=True)
app.config['SECRET_KEY'] = 'gjr39dkjn344_!67#'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///faces_database.sqlite'
face_database = SQLAlchemy(app)

app.register_blueprint(main_blueprint)
