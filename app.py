# File path: app.py

from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_cors import CORS
from flask_session import Session
from datetime import datetime
import pickle
import requests

app = Flask(__name__)
app.secret_key = 'your_secret_key'
CORS(app)

app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

def load_database(filename):
    """Load the user database from a pickle file."""
    try:
        with open(filename, 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        return []

def save_database(filename, data):
    """Save the user database to a pickle file."""
    with open(filename, 'wb') as f:
        pickle.dump(data, f)

def get_movie_details(title):
    """Fetch movie details from TMDB API based on the movie title."""
    api_key = '[your_tmbd_api_key]'
    url = f"https://api.themoviedb.org/3/search/movie?api_key={api_key}&query={title}"
    
    response = requests.get(url)
    data = response.json()
    
    if data['results']:
        return {
            'title': data['results'][0]['title'],
            'poster_path': data['results'][0]['poster_path'],
            'vote_average': data['results'][0]['vote_average'],
            'genre_ids': data['results'][0]['genre_ids'],
            'certification': data['results'][0].get('certification', 'N/A')  # Get certification if available
        }
    
    return None

@app.route('/')
def index():
    """Serve the login/register page (index.html)."""
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    """Handle user registration."""
    data = request.json
    username = data['username']
    dob = data['dob']  # Get date of birth from the data
    password = data['password']
    
    # Calculate age from date of birth
    try:
        dob_date = datetime.strptime(dob, "%Y-%m-%d")
        age = (datetime.now() - dob_date).days // 365  # Calculate age in years
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid date format!'}), 400

    database = load_database("dataBase.pkl")
    
    if any(user['username'] == username for user in database):
        return jsonify({'status': 'error', 'message': 'Username already exists!'}), 400

    new_user = {'username': username, 'age': age, 'password': password, 'liked_movies': [], 'disliked_movies': []}
    database.append(new_user)
    save_database("dataBase.pkl", database)
    
    return jsonify({'status': 'success', 'message': 'Account created successfully!'})

@app.route('/login', methods=['POST'])
def login():
    """Handle user login."""
    data = request.json
    username = data['username']
    password = data['password']
    
    database = load_database("dataBase.pkl")
    
    for user in database:
        if user['username'] == username and user['password'] == password:
            session['username'] = username
            session['age'] = user['age']
            session['liked_movies'] = user['liked_movies']  # Load liked movies
            session['disliked_movies'] = user['disliked_movies']  # Load disliked movies
            print(f"User  age set in session: {session['age']}")
            return jsonify({'status': 'success', 'redirect': url_for('dashboard'), 'age': user['age']})

    return jsonify({'status': 'error', 'message': 'Invalid username or password!'}), 401

API_KEY = '[your_tmbd_api_key]'
@app.route('/search_movie', methods=['POST'])
def search_movie():
    """Handle movie search and check age appropriateness."""
    data = request.json
    movie_title = data.get('title')
    age = session.get('age', 18)

    print(f"Searching for movie: {movie_title}, User Age: {age}")  # Debugging line

    movie_details = get_movie_details(movie_title)
    if movie_details:
        certification = movie_details.get('certification')
        print(f"Movie Certification: {certification}, User Age: {age}")  # Debugging line
        if not is_movie_age_appropriate(certification, age):
            return jsonify({'status': 'error', 'message': 'You are not old enough to watch this movie!'}), 403
        return jsonify({'status': 'success', 'movie': movie_details})

    return jsonify({'status': 'error', 'message': 'Movie not found!'}), 404
def is_movie_age_appropriate(certification, age):
    """Check if the movie certification is appropriate for the user's age."""
    print(f"Checking certification: {certification} for age: {age}")  # Debugging line
    if certification in ['G', 'PG', 'N/A']:  # Allow N/A for all ages
        return True
    elif certification == 'PG-13' and age >= 13:
        return True
    elif certification == 'R' and age >= 18:
        return True
    return False
def get_certification_based_on_age(age):
    """Determine the certification for movies based on user age."""
    try:
        age = int(age)  # Convert the age to an integer
    except ValueError:
        return None  # Return None if age is not a valid integer
    
    if age < 13:
        return "G,PG"  # Children content
    elif age < 18:
        return "PG-13"  # Teenager content
    else:
        return None  # Adults, no filter

@app.route('/like_movie', methods=['POST'])
def like_movie():
    """Handle liking a movie."""
    data = request.json
    movie_title = data.get('movie')

    if not movie_title:
        return jsonify({'status': 'error', 'message': 'Movie title is required!'}), 400

    print(f"Received movie title to like: {movie_title}")

    database = load_database("dataBase.pkl")
    for user in database:
        if user['username'] == session['username']:
            if movie_title in user['disliked_movies']:
                return jsonify({'status': 'error', 'message': 'Cannot like a movie that is disliked!'}), 400

            if movie_title not in user['liked_movies']:
                user['liked_movies'].append(movie_title)
                save_database("dataBase.pkl", database)
                
                # Fetch recommended movies after liking
                recommended_movies = get_recommended_movies_for_user(user)
                return jsonify({'status': 'success', 'message': 'Movie liked!', 'recommended_movies': recommended_movies})

            return jsonify({'status': 'error', 'message': 'Movie already liked!'}), 400

    return jsonify({'status': 'error', 'message': 'User  not found!'}), 404

@app.route('/dislike_movie', methods=['POST'])
def dislike_movie():
    """Handle disliking a movie."""
    data = request.json
    movie_title = data.get('movie')

    if not movie_title:
        return jsonify({'status': 'error', 'message': 'Movie title is required!'}), 400

    database = load_database("dataBase.pkl")
    for user in database:
        if user['username'] == session['username']:
            if movie_title in user['liked_movies']:
                return jsonify({'status': 'error', 'message': 'Cannot dislike a movie that is liked!'}), 400

            if movie_title not in user['disliked_movies']:
                user['disliked_movies'].append(movie_title)
                save_database("dataBase.pkl", database)

                # Fetch recommended movies after disliking
                recommended_movies = get_recommended_movies_for_user(user)
                return jsonify({'status': 'success', 'message': 'Movie disliked!', 'recommended_movies': recommended_movies})

            return jsonify({'status': 'error', 'message': 'Movie already disliked!'}), 400

    return jsonify({'status': 'error', 'message': 'User  not found!'}), 404

def get_recommended_movies_for_user(user):
    """Fetch recommended movies based on the user's liked and disliked movies."""
    genre_weights = {}
    rating_threshold = 7.0  # Adjust as needed

    for movie_title in user['liked_movies']:
        movie_details = get_movie_details(movie_title)
        if movie_details:
            for genre_id in movie_details['genre_ids']:
                genre_weights[genre_id] = genre_weights.get(genre_id, 0) + 1

    for movie_title in user['disliked_movies']:
        movie_details = get_movie_details(movie_title)
        if movie_details:
            for genre_id in movie_details['genre_ids']:
                genre_weights[genre_id] = genre_weights.get(genre_id, 0) - 1

    recommended_movies = recommend_movies(genre_weights, rating_threshold, user['age'])
    return recommended_movies[:15]  # Limit to 15 recommended movies
@app.route('/dashboard')
def dashboard():
    """Serve the dashboard with liked, disliked, and recommended/random movies."""
    # Load user data from the database
    database = load_database("dataBase.pkl")
    user = next((u for u in database if u['username'] == session['username']), None)

    if user:
        liked_movies = user['liked_movies']
        disliked_movies = user['disliked_movies']
        age = user['age']

        # Combine liked and disliked movies
        total_movies = liked_movies + disliked_movies

        # Prepare to store details and genre weights
        genre_weights = {}
        rating_threshold = 7.0  # Threshold for rating-based filtering
        
        liked_movies_details = []
        disliked_movies_details = []

        # Fetch details for recent movies and update genre weights
        for movie_title in total_movies:
            movie_details = get_movie_details(movie_title)
            if movie_details:
                if movie_title in liked_movies:
                    liked_movies_details.append(movie_details)
                    # Increase weight for liked genres
                    for genre_id in movie_details['genre_ids']:
                        genre_weights[genre_id] = genre_weights.get(genre_id, 0) + 1
                elif movie_title in disliked_movies:
                    disliked_movies_details.append(movie_details)
                    # Decrease weight for disliked genres
                    for genre_id in movie_details['genre_ids']:
                        genre_weights[genre_id] = genre_weights.get(genre_id, 0) - 1

        # Determine which movies to show in the carousel
        if total_movies:  # If there are any liked or disliked movies
            recommended_movies = recommend_movies(genre_weights, rating_threshold, age)
        else:  # If no liked or disliked movies, fetch random movies
            recommended_movies = fetch_random_movies(age)

        return render_template('dashboard.html',
                               liked_movies=liked_movies_details, 
                               disliked_movies=disliked_movies_details, 
                               recommended_movies=recommended_movies,
                               username=session['username'])
    
    return redirect(url_for('index'))  # Redirect if user not found

def fetch_random_movies(age):
    """Fetch random movies from TMDB API, filtering by age."""
    random_movies = []
    url = f"https://api.themoviedb.org/3/discover/movie?api_key={API_KEY}&sort_by=popularity.desc"
    
    certification = get_certification_based_on_age(age)
    if certification:
        url += f"&certification_country=US&certification.lte={certification}"
    
    response = requests.get(url)
    data = response.json()
    
    if data['results']:
        for movie in data['results'][:5]:  # Limit to 5 movies
            random_movies.append({
                'title': movie['title'],
                'poster_path': movie['poster_path'],
                'vote_average': movie['vote_average']
            })
    
    return random_movies

def recommend_movies(genre_weights, rating_threshold, age):
    """Recommend movies based on genre weights, rating threshold, and age."""
    recommended_movies = []
    
    # Get preferred genres sorted by weight
    preferred_genres = [genre for genre, weight in sorted(genre_weights.items(), key=lambda item: item[1], reverse=True) if weight > 0]
    
    # If no preferred genres, return an empty list
    if not preferred_genres:
        return recommended_movies  
    
    # Create a genre query for the top 3 preferred genres
    genre_query = ','.join(map(str, preferred_genres[:3]))  
    url = f"https://api.themoviedb.org/3/discover/movie?api_key={API_KEY}&with_genres={genre_query}&sort_by=vote_average.desc&vote_average.gte={rating_threshold}"
    
    # Get certification based on age
    certification = get_certification_based_on_age(age)
    if certification:
        url += f"&certification_country=US&certification.lte={certification}"
    
    # Fetch movies from TMDB API
    response = requests.get(url)
    data = response.json()
    
    # Limit the number of recommended movies to a maximum of 15
    if data['results']:
        liked_movies = {title.lower() for title in session.get('liked_movies', [])}
        disliked_movies = {title.lower() for title in session.get('disliked_movies', [])}
        
        for movie in data['results']:
            if movie['title'].lower() not in liked_movies and movie['title'].lower() not in disliked_movies:
                recommended_movies.append({
                    'title': movie['title'],
                    'poster_path': movie['poster_path'],
                    'vote_average': movie['vote_average']
                })
                if len(recommended_movies) >= 15:  # Limit to 15 recommended movies
                    break
    
    return recommended_movies
@app.route("/recommended_movies", methods=["GET"])
def recommended_movies_endpoint():
    """Fetch and return recommended movies based on liked and disliked movies."""
    liked_movies = session.get('liked_movies', [])
    disliked_movies = session.get('disliked_movies', [])
    age = session.get('age', 18)

    # Prepare genre weights based on liked/disliked movies
    genre_weights = {}
    rating_threshold = 7.0  # You can adjust the threshold as needed

    # Fetch liked movie details
    for movie_title in liked_movies:
        movie_details = get_movie_details(movie_title)
        if movie_details:
            for genre_id in movie_details['genre_ids']:
                genre_weights[genre_id] = genre_weights.get(genre_id, 0) + 1

    # Fetch disliked movie details
    for movie_title in disliked_movies:
        movie_details = get_movie_details(movie_title)
        if movie_details:
            for genre_id in movie_details['genre_ids']:
                genre_weights[genre_id] = genre_weights.get(genre_id, 0) - 1

    # Get recommended movies
    recommended_movies = recommend_movies(genre_weights, rating_threshold, age)
    
    return jsonify(recommended_movies[:15])  # Limit to 15 recommended movies

@app.route('/user_movies')
def user_movies():
    """Fetch the liked and disliked movies for the logged-in user."""
    # Load user data from the database
    database = load_database("dataBase.pkl")
    user = next((u for u in database if u['username'] == session['username']), None)

    if user:
        return jsonify({
            'liked_movies': user['liked_movies'],
            'disliked_movies': user['disliked_movies']
        })
    
    return jsonify({'liked_movies': [], 'disliked_movies': []}), 404  # Return empty lists if user not found

@app.route('/logout')
def logout():
    session.clear()  
    return redirect(url_for('index'))



    """Fetch recommended movies based on liked movies."""
    liked_movies = session.get('liked_movies', [])
    disliked_movies = session.get('disliked_movies', [])
    age = session.get('age', 18)

    # Prepare genre weights based on liked/disliked movies
    genre_weights = {}
    rating_threshold = 7.0  # You can adjust the threshold as needed

    # Fetch liked movie details
    for movie_title in liked_movies:
        movie_details = get_movie_details(movie_title)
        if movie_details:
            for genre_id in movie_details['genre_ids']:
                genre_weights[genre_id] = genre_weights.get(genre_id, 0) + 1

    # Fetch disliked movie details
    for movie_title in disliked_movies:
        movie_details = get_movie_details(movie_title)
        if movie_details:
            for genre_id in movie_details['genre_ids']:
                genre_weights[genre_id] = genre_weights.get(genre_id, 0) - 1

    # Get recommended movies
    recommended_movies = recommend_movies(genre_weights, rating_threshold, age)
    
    return jsonify(recommended_movies[:15])  # Limit to 15 recommended movies
if __name__ == '__main__':
    app.run(debug=True)