from __future__ import annotations
import io
# import tempfile
import base64
from deepface import DeepFace
import PIL.Image


# from flask import session
from flask_socketio import emit  # , join_room, leave_room
from flask import request
from app import socketio
from .utils import combined_analyze, pretty_result
import cv2
import numpy as np
from multiprocessing import Lock

session_settings_lock = Lock()
session_settings = {}


def actions_dict_to_tuple(actions):
    injection_actions_dict = {'sex': 'gender', 'ethnicity': 'race'}
    return tuple(injection_actions_dict.get(action, action)
                 for action, value in actions.items() if value == True)


def base64_to_numpy_image(base64_string: str | bytes) -> np.ndarray:
    image = base64.b64decode(base64_string[22:])
    array = np.asarray(bytearray(io.BytesIO(image).read()), dtype=np.uint8)
    return cv2.imdecode(array, cv2.IMREAD_COLOR)


@socketio.on('connect')
def initialize():
    print(f'Client connected: {request.sid}')

    session_settings_lock.acquire()
    session_settings[request.sid] = {'actions': {}}
    session_settings_lock.release()
    # emit('selected_actions', {})
    emit('result', {'frame_index': -1, 'result': 'Connected'})


@socketio.on('frame')
def handle_frame(frame):
    image = base64_to_numpy_image(frame.get('frame_data'))

    # use deepface to detect faces
    result = 'No face detected'

    # actions to perform
    session_settings_lock.acquire()
    settings = session_settings.get(request.sid)
    session_settings_lock.release()

    actions = actions_dict_to_tuple(settings['actions'])

    detector_backend = settings['actions'].get(
        'detection_backend', 'opencv')
    representation_backend = settings['actions'].get(
        'representation_backend', 'vgg-face')

    settings_json = {'detection_backend': detector_backend,
                     'representation_backend': representation_backend}

    try:
        # Extract faces here
        # faces = DeepFace.extract_faces(
        #     image, detector_backend=detector_backend)

        result = combined_analyze(image, actions=actions,
                                  enforce_actions=False,
                                  detector_backend=detector_backend)

        # texts = f"detector_backend: {detector_backend}\nrepresentation_backend: {representation_backend}"
        result_faces = []
        for obj in result:
            # for some reason a copy is needed (otherwise, the original object is modified)
            obj_copy = obj.copy()
            region = obj_copy.get('region', None)

            if region:
                # x, y, w, h = region
                x, y, w, h = int(region['x']), int(
                    region['y']), int(region['w']), int(region['h'])

                face = image[y:y+h, x:x+w]
                # encode face in base64
                face = cv2.imencode('.png', face)[1].tostring()
                face = base64.b64encode(face).decode('utf-8')
                obj['face'] = f'data:image/png;base64,{face}'
                # cv2.imshow('face', face)
                # cv2.waitKey(1)

            result_faces.append(obj)
            # text = '\n'
            # for key, value in obj.items():
            #     if isinstance(value, dict):
            #         for k, v in value.items():
            #             text += f'{k}: {v}\n'
            #     else:
            #         text += f'{key}: {value}\n'
            # texts += text

        result = result_faces

    except ValueError:
        # import traceback
        # traceback.print_exc()
        result = 'No face detected'

    # print(f'{result = }')

    result_html = pretty_result(result, settings_json)
    emit('result', {
         'frame_index': frame['frame_index'], 'faces': result, 'settings': settings_json, 'result': result_html})
    # empty message queue


@socketio.on('add_face')
def add_face(frame):
    print('add face')
    image = base64_to_numpy_image(frame.get('frame_data'))[:, :, ::-1]

    session_settings_lock.acquire()
    settings = session_settings.get(request.sid)
    session_settings_lock.release()

    detection_backend = settings['actions'].get(
        'detection_backend', 'opencv')

    # use deepface to detect faces
    face = DeepFace.extract_faces(
        image, detector_backend=detection_backend, enforce_detection=False)[0]

    # display face detected face
    print(face)

    cv2.imshow('face', face.get('face'))
    cv2.waitKey(1)

    # save image file
    # filename = f'test_{frame["name"]}_{frame["id"]}.png'
    # PIL.Image.fromarray(image).save(filename)

    # for each face detected, add it to the database
    # compute all the possible embeddings
    # save the embeddings in the database
    # save the image in the database
    # save the name in the database

    # use deepface to detect faces

    # print(frame)


@socketio.on('selected_actions')
def selected_actions(actions):
    # settings to select which actions to perform
    session_settings_lock.acquire()
    session_settings[request.sid].update({'actions': actions})
    # print(session_settings[request.sid]['actions'])
    session_settings_lock.release()
