const apiUrl =
  "https://api.themoviedb.org/3/discover/movie?api_key=[your_tmbd_api_key]&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=1"; // Ensure you replace YOUR_API_KEY with your actual API key

function log() {
  window.location.href = "/"; // Redirect to the login page
}

function scrollCarouselLeft() {
  const carousel = document.getElementById("movie-carousel");
  const scrollAmount = carousel.clientWidth / 2;
  carousel.scrollLeft -= scrollAmount;
  if (carousel.scrollLeft <= 0) {
    carousel.scrollLeft = carousel.scrollWidth - carousel.clientWidth;
  }
}

function scrollCarouselRight() {
  const carousel = document.getElementById("movie-carousel");
  const scrollAmount = carousel.clientWidth / 2;
  carousel.scrollLeft += scrollAmount;
  if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth) {
    carousel.scrollLeft = 0;
  }
}

$(document).ready(function () {
  $("#search").on("click", function () {
    let searchTerm = $("#term").val();

    if (searchTerm) {
      $.ajax({
        url: "/search_movie",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ title: searchTerm }),
        success: function (response) {
          if (response.status === "success") {
            displayMovieCard(response.movie); // Display the movie details
          } else {
            alert(response.message); // Handle the error message
          }
        },
        error: function (jqXHR) {
          alert(jqXHR.responseJSON.message); // Display error message
        },
      });
    } else {
      $("#poster").html("<p>Please enter a movie title</p>");
    }
  });

  // Function to dynamically create a movie card and display it
  function displayMovieCard(movie) {
    let posterUrl = `http://image.tmdb.org/t/p/w500/${movie.poster_path}`;

    let movieCard = `
    <div class="movie-card">
      <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" />
      <h3 class="movie-title">${movie.title}</h3>
      <p class="movie-rating">Rating: ${movie.vote_average}</p>
      <div class="movie-actions">
        <button class="like-btn" data-movie="${movie.title}">
          <i class="fa-solid fa-thumbs-up"></i>
        </button>
        <button class="dislike-btn" data-movie="${movie.title}">
          <i class="fa-solid fa-thumbs-down"></i>
        </button>
      </div>
    </div>
  `;

    // Add the movie card to the poster div
    $("#poster").html(movieCard);

    // Add click event handlers for Like and Dislike buttons
    $(".like-btn").on("click", function () {
      let movieTitle = $(this).data("movie");
      likeMovie(movieTitle);
    });

    $(".dislike-btn").on("click", function () {
      let movieTitle = $(this).data("movie");
      dislikeMovie(movieTitle);
    });
  }
  function likeMovie(title) {
    console.log("Liking movie:", title);
    if (!title) {
      console.error("Movie title is undefined.");
      return;
    }
    $.ajax({
      url: "/like_movie",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ movie: title }),
      success: function (response) {
        console.log("Response from like movie:", response);
        // Update the UI with new recommendations
        updateRecommendedMoviesDisplay(response.recommended_movies);
      },
      error: function (jqXHR) {
        alert(jqXHR.responseJSON.message);
      },
    });
  }

  function dislikeMovie(title) {
    console.log("Disliking movie:", title);
    if (!title) {
      console.error("Movie title is undefined.");
      return;
    }
    $.ajax({
      url: "/dislike_movie",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ movie: title }),
      success: function (response) {
        console.log("Response from dislike movie:", response);
        // Update the UI with new recommendations
        updateRecommendedMoviesDisplay(response.recommended_movies);
      },
      error: function (jqXHR) {
        alert(jqXHR.responseJSON.message);
      },
    });
  }
  function fetchRecommendedMovies() {
    $.ajax({
      url: "/get_recommended_movies",
      method: "GET",
      success: function (response) {
        if (response.status === "success") {
          updateRecommendedMoviesDisplay(response.recommended_movies);
        } else {
          alert(response.message); // Handle any error messages
        }
      },
      error: function (jqXHR) {
        alert(
          "Error fetching recommended movies: " + jqXHR.responseJSON.message
        );
      },
    });
  }

  function updateRecommendedMoviesDisplay(movies) {
    const recommendedMoviesContainer = $("#recommended-movies");
    recommendedMoviesContainer.empty(); // Clear existing recommendations
    if (movies.length === 0) {
      recommendedMoviesContainer.append("<p>No recommendations available.</p>");
      return;
    }
    movies.forEach((movie) => {
      const posterHTML = `
        <div class="movie-card">
            <img src="http://image.tmdb.org/t/p/w500/${movie.poster_path}" alt="${movie.title}" class="movie-poster">
            <h3 class="movie-title">${movie.title}</h3>
            <p class="movie-rating">Rating: ${movie.vote_average}</p>
            <div class="movie-actions">
                <button class="like-btn" data-movie="${movie.title}">
                    <i class="fa-solid fa-thumbs-up"></i>
                </button>
                <button class="dislike-btn" data-movie="${movie.title}">
                    <i class="fa-solid fa-thumbs-down"></i>
                </button>
            </div>
        </div>`;
      recommendedMoviesContainer.append(posterHTML);
    });
  }
  // Fetch user liked and disliked movies from the server
  $.get("/user_movies", function (data) {
    const likedMovies = new Set(data.liked_movies); // Load from database
    const dislikedMovies = new Set(data.disliked_movies); // Load from database

    const fetchMovies = function (type) {
      $("#movie-carousel").html(
        '<div class="alert"><strong>Loading...</strong></div>'
      );
      const allMovies = [];
      let moviesDisplayed = 0;
      const maxMovies = type === "recommended" ? 15 : 5; // Show 15 for recommended, 5 for random

      const fetchMoviesRecursively = function (page = 1) {
        $.getJSON(apiUrl + "&page=" + page, function (json) {
          console.log(`Fetching page ${page} for ${type} movies`, json);
          console.log("Liked Movies: ", Array.from(likedMovies));
          console.log("Disliked Movies: ", Array.from(dislikedMovies));

          for (
            let i = 0;
            i < json.results.length && moviesDisplayed < maxMovies;
            i++
          ) {
            const movie = json.results[i];
            if (movie && movie.vote_average >= 7) {
              const movieTitle = movie.title.toLowerCase(); // Ensure consistent casing

              // Check if movie is liked or disliked (using lower case)
              if (
                !likedMovies.has(movieTitle) &&
                !dislikedMovies.has(movieTitle)
              ) {
                allMovies.push(movie);
                const posterHTML = `
                <div class="movie-card">
                  <img src="http://image.tmdb.org/t/p/w500/${movie.poster_path}" alt="${movie.title}" class="movie-poster">
                  <h3 class="movie-title">${movie.title}</h3>
                  <p class="movie-rating">Rating: ${movie.vote_average}</p>
                  <div class="movie-actions">
                    <button class="like-btn" data-movie="${movie.title}">
                      <i class="fa-solid fa-thumbs-up"></i>
                    </button>
                    <button class="dislike-btn" data-movie="${movie.title}">
                      <i class="fa-solid fa-thumbs-down"></i>
                    </button>
                  </div>
                </div>
              `;
                $("#movie-carousel").append(posterHTML);
                moviesDisplayed++;
              } else {
                console.log(`Filtered out movie: ${movie.title}`); // Log filtered out movies
              }
            }
          }

          if (moviesDisplayed < maxMovies && page < 500) {
            fetchMoviesRecursively(page + 1);
          } else {
            $(".alert").remove();
          }

          if (moviesDisplayed === 0 && page === 500) {
            $("#movie-carousel").html(
              '<div class="alert"><strong>No suitable movies found.</strong></div>'
            );
          }
        }).fail(function (jqXHR, textStatus, errorThrown) {
          console.error("Error fetching movies: ", textStatus, errorThrown);
        });
      };

      const randomStartingPage = Math.floor(Math.random() * 500) + 1; // Start from a random page
      fetchMoviesRecursively(randomStartingPage);
    };

    const refreshRecommendations = function () {
      $.get("/recommended_movies", function (data) {
        $("#recommended-movies").empty();
        data.forEach((movie) => {
          const posterHTML = `
            <div class=" movie-card">
              <img src="http://image.tmdb.org/t/p/w500/${movie.poster_path}" alt="${movie.title}" class="movie-poster">
              <h3 class="movie-title">${movie.title}</h3>
              <p class="movie-rating">Rating: ${movie.vote_average}</p>
              <div class="movie-actions">
                <button class="like-btn" data-movie="${movie.title}">
                  <i class="fa-solid fa-thumbs-up"></i>
                </button>
                <button class="dislike-btn" data-movie="${movie.title}">
                  <i class="fa-solid fa-thumbs-down"></i>
                </button>
              </div>
            </div>
          `;
          $("#recommended-movies").append(posterHTML);
        });
      }).fail(function (jqXHR, textStatus, errorThrown) {
        console.error(
          "Error fetching recommended movies: ",
          textStatus,
          errorThrown
        );
      });
    };

    const pageType = sessionStorage.getItem("pageType");
    if (likedMovies.size > 0 || dislikedMovies.size > 0) {
      // Fetch recommended movies if the user has liked or disliked movies
      $.get("/recommended_movies", function (data) {
        $("#movie-carousel").empty();
        data.forEach((movie) => {
          const posterHTML = `
            <div class="movie-card">
              <img src="http://image.tmdb.org/t/p/w500/${movie.poster_path}" alt="${movie.title}" class="movie-poster">
              <h3 class="movie-title">${movie.title}</h3>
              <p class="movie-rating">Rating: ${movie.vote_average}</p>
              <div class="movie-actions">
                <button class="like-btn" data-movie="${movie.title}">
                  <i class="fa-solid fa-thumbs-up"></i>
                </button>
                <button class="dislike-btn" data-movie="${movie.title}">
                  <i class="fa-solid fa-thumbs-down"></i>
                </button>
              </div>
            </div>
          `;
          $("#movie-carousel").append(posterHTML);
        });
      }).fail(function (jqXHR, textStatus, errorThrown) {
        console.error(
          "Error fetching recommended movies: ",
          textStatus,
          errorThrown
        );
      });
    } else {
      // Fetch random movies if the user has no liked or disliked movies
      fetchMovies("random");
    }

    // Update database when a movie is liked
    $(document).on("click", ".like-btn", function () {
      const movieTitle = $(this).data("movie").toLowerCase();
      likedMovies.add(movieTitle); // Add movie to the likedMovies set

      $.ajax({
        type: "POST",
        url: "/like_movie",
        contentType: "application/json",
        data: JSON.stringify({ movie: movieTitle }),
        success: function (response) {
          console.log("Response from like movie:", response);

          // Update UI immediately
          updateLikedMoviesDisplay(movieTitle);

          // Fetch recommended movies if this is the first like
          if (likedMovies.size === 1) {
            fetchRecommendedMovies();
          }
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.error("Error liking the movie: ", textStatus, errorThrown);
          alert("Error liking the movie!");
        },
      });
    });

    // Update database when a movie is disliked
    $(document).on("click", ".dislike-btn", function () {
      const movieTitle = $(this).data("movie").toLowerCase();
      dislikedMovies.add(movieTitle);

      $.ajax({
        type: "POST",
        url: "/dislike_movie",
        contentType: "application/json",
        data: JSON.stringify({ movie: movieTitle }),
        success: function (response) {
          console.log("Response from dislike movie:", response);

          // Update UI immediately
          updateDislikedMoviesDisplay(movieTitle);

          // Fetch recommended movies if this is the first dislike
          if (dislikedMovies.size === 1) {
            fetchRecommendedMovies();
          }
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.error("Error disliking the movie: ", textStatus, errorThrown);
          alert("Error disliking the movie!");
        },
      });
    });

    function updateLikedMoviesDisplay(movieTitle) {
      $.get(
        `https://api.themoviedb.org/3/search/movie?api_key=[your_tmbd_api_key]&query=${movieTitle}`,
        function (response) {
          if (response.results && response.results.length > 0) {
            const movie = response.results[0];
            const posterUrl = `http://image.tmdb.org/t/p/w500/${movie.poster_path}`;
            let movieCard = `
              <div class="movie-card" data-title="${movie.title}">
                <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" />
                <h3 class="movie-title">${movie.title}</h3>
                <p class="movie-rating">Rating: ${movie.vote_average}</p>
                <div class="movie-actions">
                  <button class="like-btn" data-movie="${movie.title}">
                    <i class="fa-solid fa-thumbs-up"></i>
                  </button>
                  <button class="dislike-btn" data-movie="${movie.title}">
                    <i class="fa-solid fa-thumbs-down"></i>
                  </button>
                </div>
              </div>
              `;
            // Check if the movie is already in the liked movies section
            if (
              $("#liked-movies").find(`[data-title="${movie.title}"]`)
                .length === 0
            ) {
              $("#liked-movies").append(movieCard); // Append to liked movies section if not already present
            }
          }
        }
      ).fail(function () {
        console.error("Error fetching movie details for:", movieTitle);
      });
    }

    // Function to update disliked movies display
    function updateDislikedMoviesDisplay(movieTitle) {
      // Fetch movie details to get poster and rating
      $.get(
        `https://api.themoviedb.org/3/search/movie?api_key=[your_tmbd_api_key]&query=${movieTitle}`,
        function (response) {
          if (response.results && response.results.length > 0) {
            const movie = response.results[0];
            const posterUrl = `http://image.tmdb.org/t/p/w500/${movie.poster_path}`;
            let movieCard = `
<div class="movie-card" data-title="${movie.title}">
  <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" />
  <h3 class="movie-title">${movie.title}</h3>
  <p class="movie-rating">Rating: ${movie.vote_average}</p>
  <div class="movie-actions">
    <button class="like-btn" data-movie="${movie.title}">
      <i class="fa-solid fa-thumbs-up"></i>
    </button>
    <button class="dislike-btn" data-movie="${movie.title}">
      <i class="fa-solid fa-thumbs-down"></i>
    </button>
  </div>
</div>
`;
            $("#disliked-movies").append(movieCard); // Append to disliked movies section
          }
        }
      );
    }

    // Function to fetch recommended movies
    function fetchRecommendedMovies() {
      $.get("/recommended_movies", function (data) {
        $("#recommended-movies").empty();
        data.forEach((movie) => {
          const posterHTML = `
          <div class="movie-card">
            <img src="http://image.tmdb.org/t/p/w500/${movie.poster_path}" alt="${movie.title}" class=" movie-poster">
            <h3 class="movie-title">${movie.title}</h3>
            <p class="movie-rating">Rating: ${movie.vote_average}</p>
            <div class="movie-actions">
              <button class="like-btn" data-movie="${movie.title}">
                <i class="fa-solid fa-thumbs-up"></i>
              </button>
              <button class="dislike-btn" data-movie="${movie.title}">
                <i class="fa-solid fa-thumbs-down"></i>
              </button>
            </div>
          </div>
        `;
          $("#recommended-movies").append(posterHTML);
        });
      }).fail(function (jqXHR, textStatus, errorThrown) {
        console.error(
          "Error fetching recommended movies: ",
          textStatus,
          errorThrown
        );
      });
    }

    // Call the function to fetch recommended movies
    fetchRecommendedMovies();
  });
});
