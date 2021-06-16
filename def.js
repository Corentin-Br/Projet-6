var answersPerAPIPage = 5;
var moviesPerCategory = 7;
var displayedMovies = 4;
const categories = document.querySelectorAll('div.category');
const bestMovieTag = document.querySelector('div.best_movie');
const bestMovieModalButton = document.querySelector('button.best_movie__open_modal');
const modalCloseButton = document.querySelector('button[data-dismiss]');
var lastFocus;
var modal = document.querySelector("#movie_informations");
var allMainButtons = [];


const getQueryResult = async function(url) {
	res = await fetch(url);
	if (res.ok) {
		return res.json();
	}
};

const getMovies = async function(queryUrl, startingMovie) {
	const firstPage = await getQueryResult(queryUrl);
	const pagesToFetch = Math.ceil((moviesPerCategory + startingMovie) / answersPerAPIPage);
	const pagesUrl = Array(pagesToFetch - 1).fill(1).map((element, index) => `${queryUrl}&page=${index+2}`);
	const data = await pagesUrl.reduce(
		async (accumulator, value) => {
			const newResult = await getQueryResult(value);
			return [...accumulator, ...newResult.results];
		}, 
		firstPage.results
	);
	return data.slice(startingMovie, moviesPerCategory + startingMovie);
};

const createDirectionButton = function(parent, direction) {
	const button = document.createElement("button");
	let image;
	let text;
	let shift;
	let previousChild;
	if (direction === "previous") {
		image = "arrow-left.svg";
		text = "Défiler vers la gauche";
		shift = -1;
		previousChild = parent.children[0];
	} else if (direction === "next") {
		image = "arrow-right.svg";
		text = "Défiler vers la droite";
		shift = 1;
		previousChild = null;
	}
	parent.insertBefore(button, previousChild);
	button.setAttribute("class", `category__${direction}`);
	button.setAttribute("type", "button");
	button.innerHTML = `<img src=${image}  alt="${text}">`;
	button.addEventListener('click', () => changeDisplayedMovies(parent.children[1].children[1], shift));
	allMainButtons.push(button);
};

const createModalButton = function(parent, data, index) {
	const modalButton = document.createElement("button");
	parent.appendChild(modalButton);
	modalButton.setAttribute("class", "category__open_modal");
	modalButton.setAttribute("type", "button");
	modalButton.setAttribute("aria-haspopups", "dialog");
	modalButton.setAttribute("aria-controls", "movie_informations");
	modalButton.innerHTML = `<img class="movie" src="${data.image_url}" alt="${data.title}">`;
	modalButton.addEventListener('click', () => openModal(modalButton, data.url, data.image_url));
	allMainButtons.push(modalButton);
	modalButton.setAttribute("aria-hidden", index < displayedMovies ? "false" : "true");
};
			
const initializeCategories = async function(category) {
	const query = `http://localhost:8000/api/v1/titles/?${category.getAttribute("id")}`;
	const ignored_movies = category.getAttribute("id") === "sort_by=-imdb_score" ? 1 : 0;
	const movie_data = await getMovies(query, ignored_movies);
	createDirectionButton(category, "previous");
	const movies = category.children[1].children[1];
	movie_data.forEach((movie, index) => {
		createModalButton(movies, movie, index);
	});
	createDirectionButton(category, "next");
};

const changeDisplayedMovies = async function(movieContainer, shiftChange=0) {
	if (shiftChange > 0) {
		movieContainer.insertBefore(movieContainer.children[0], null);
		movieContainer.children[moviesPerCategory - 1].setAttribute("aria-hidden", "true");
		movieContainer.children[displayedMovies - 1].setAttribute("aria-hidden", "false");
	} else {
		movieContainer.insertBefore(movieContainer.children[moviesPerCategory - 1], movieContainer.children[0]);
		movieContainer.children[0].setAttribute("aria-hidden", "false");
		movieContainer.children[displayedMovies].setAttribute("aria-hidden", "true");
	}	
};

const initializeBestMovie = async function() {
	data = await getQueryResult("http://localhost:8000/api/v1/titles/?sort_by=-imdb_score");
	const bestMovieData = data.results[0];
	bestMovieTag.children[0].children[0].innerHTML = bestMovieData.title;
	const details = await getQueryResult(bestMovieData.url);
	bestMovieTag.children[0].children[2].innerHTML = details.description;
	bestMovieTag.children[1].setAttribute("src", bestMovieData.image_url);
	bestMovieTag.children[1].setAttribute("alt", bestMovieData.title);
	bestMovieTag.children[0].children[1].addEventListener('click', event => {
		openModal(bestMovieTag.children[0].children[1], bestMovieData.url, bestMovieData.image_url);
	});
	allMainButtons.push(bestMovieTag.children[0].children[1])
};

const openModal = async function(button, movie_url, image_url) {
	const movieInfo = await getQueryResult(movie_url);
	const mainDocument = document.querySelector(".main-content");
	mainDocument.setAttribute("aria-hidden", true);
	modal.setAttribute("aria-hidden", false);
	loadModal(modal, movieInfo, image_url);
	setTimeout(
		() => {
		modalCloseButton.focus();
  		},
		100
	);
	lastFocus = button;
	allMainButtons.forEach(button => button.setAttribute("disabled", true));
	mainDocument.addEventListener("click", closeModal);
	document.addEventListener("keyup", event => {
		if (event.key === "Escape") {
			closeModal();
		};
	});
};

const closeModal = function() {
	const modal = document.querySelector("#movie_informations");
	const main_doc = document.querySelector(".main-content");
	main_doc.setAttribute("aria-hidden", false);
	modal.setAttribute("aria-hidden", true);
	lastFocus.focus()
	allMainButtons.forEach(button => button.removeAttribute("disabled"));
	main_doc.removeEventListener("click", closeModal);
	document.removeEventListener("keyup", event => {
		if (event.key === "Escape") {
			closeModal();
		};
	});
};
	
const convertInHours = function(time_in_minutes) {
	const minutes = time_in_minutes % 60;
	const hours = (time_in_minutes - minutes) / 60;
	const minutes_text = minutes === 0 ? "" : minutes > 1 ? `${minutes} minutes` : "1 minute";
	const hours_text = hours === 0 ? "" : hours > 1 ? `${hours} heures` : "1 heure";
	if (hours_text && minutes_text) {
		return `${hours_text} et ${minutes_text}`;
	} else {
		return `${hours_text}${minutes_text}`;
	}
};

const loadModal = function(modal, infos, url) {
	modal.children[1].children[2].setAttribute("src", url);
	modal.children[1].children[3].innerHTML = `
				<li><span role="legend">Titre</span> : ${infos.title}</li>
				<li><span role="legend">Genres</span> : ${infos.genres.join(", ")}</li>
				<li><span role="legend">Date de sortie</span>: ${infos.date_published}</li>
				<li><span role="legend">Limite d'âge</span> : ${infos.rated === "Not rated or unkown rating" ? "Inconnue" : infos.rated}</li>
				<li><span role="legend">Score IMDB</span> : ${infos.imdb_score}</li>
				<li><span role="legend">Réalisateur</span> : ${infos.directors.join(", ")}</li>
				<li><span role="legend">Acteurs</span> : ${infos.actors.join(", ")}</li>
				<li><span role="legend">Durée</span> : ${convertInHours(infos.duration)}</li>
				<li><span role="legend">Pays d'origine</span> : ${infos.countries.join(", ")} </li>
				<li><span role="legend">Résultat au box office</span> : ${infos.worldwide_gross_income === null ? "inconnu" : `${infos.worldwide_gross_income} USD`}</li>
				<li><span role="legend">Résumé</span> : ${infos.long_description}</li>
			`
};

categories.forEach(async category => {
	await initializeCategories(category);
});	

initializeBestMovie();

modalCloseButton.addEventListener('click', event => closeModal(modalCloseButton));
