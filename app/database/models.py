from app import face_database

class Person(face_database.Model):
    user_id = face_database.Column(face_database.Integer, primary_key=True)
    name = face_database.Column(face_database.String(100), nullable=False)
    # Use relationship to link to the Face class
    face_encodings = face_database.relationship('Face', backref='person', lazy=True)

    def __repr__(self):
        return f'Person (ID: {self.user_id}): {self.name}'
    
class Face(face_database.Model):
    face_id = face_database.Column(face_database.Integer, primary_key=True)
    # Use the user_id column from the Person class
    user_id = face_database.Column(face_database.Integer, face_database.ForeignKey('person.user_id'), nullable=False)
    face_encoding = face_database.Column(face_database.PickleType, nullable=False)

    def __repr__(self):
        return f'Face (ID: {self.face_id}): {self.face_encoding}'
    
# Create the database tables if they don't exist
face_database.create_all()
