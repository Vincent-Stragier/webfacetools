#!/bin/env python
from app import app, socketio

if __name__ == '__main__':
    app.debug = True
    socketio.init_app(app, async_mode='eventlet')
    socketio.run(app)
