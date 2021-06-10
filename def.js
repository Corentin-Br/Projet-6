var answers_per_API_page = 5 
var movies_per_category = 7
var movies_displayed = 4 
const categories = document.querySelectorAll('div.category');
const best_movie_div = document.querySelector('div.bestmovie');
const best_movie_button_modal = document.querySelector('button.best_movie_open_modal')
const modal_close_button = document.querySelector('button[data-dismiss]');
var last_focus;
var modal = document.getElementById("movie_informations");
var all_main_buttons = []


const get_query_result = async function(url) {
	res = await fetch(url);
	if (res.ok) {
		return res.json();
	}
};

const get_movies = async function(query_url, starting_movie) {
	const first_page = await get_query_result(query_url)
	const pages_to_fetch = Math.ceil((movies_per_category + starting_movie) / answers_per_API_page);
	const pages_url = Array(pages_to_fetch - 1).fill(1).map((element, index) => `${query_url}&page=${index+2}`);
	const data = await pages_url.reduce(
		async (accumulator, value) => {
			const new_result = await get_query_result(value);
			return [...accumulator, ...new_result.results];
		}, 
		first_page.results
	);
	return data.slice(starting_movie, movies_per_category + starting_movie);
}	

const create_direction_button = function(parent, direction) {
	const button = document.createElement("button");
	let image = "arrow-right.svg";
	let text = "Défiler vers la droite";
	let shift = 1;
	if (direction === "previous") {
		image = "arrow-left.svg"
		text = "Défiler vers la gauche"
		shift = -1
	}
	parent.appendChild(button);
	button.setAttribute("class", direction);
	button.setAttribute("type", "button");
	button.innerHTML = `<img src=${image}  alt=${text}></img>`;
	button.addEventListener('click', event => change_displayed_movies(parent, shift));
	all_main_buttons.push(button);
}

const create_modal_button = function(parent, data, index) {
	const modal_button = document.createElement("button");
	parent.appendChild(modal_button);
	modal_button.setAttribute("class", "open_modal");
	modal_button.setAttribute("type", "button");
	modal_button.setAttribute("aria-haspopups", "dialog");
	modal_button.setAttribute("aria-controls", "movie_informations");
	modal_button.innerHTML = `<img class="movie" src="${data.image_url}" alt="${data.title}"></img>`;
	modal_button.addEventListener('click', event => open_modal(modal_button, data.url, data.image_url));
	all_main_buttons.push(modal_button);
	modal_button.setAttribute("aria-hidden", index < movies_displayed ? "false" : "true");
}
		
	
const set_categories = async function(category) {
	const query = "http://localhost:8000/api/v1/titles/?" + category.getAttribute("query");
	const ignored_movies = category.getAttribute("query") === "sort_by=-imdb_score" ? 1 : 0;
	const movie_data = await get_movies(query, ignored_movies);
	const movies = category.children[1];
	create_direction_button(movies, "previous")
	movie_data.forEach((movie, index) => {
		create_modal_button(movies, movie, index);
	});
	create_direction_button(movies, "next");
}


const change_displayed_movies = async function(movie_container, shift_change=0) {
	if (shift_change > 0) {
		movie_container.insertBefore(movie_container.children[1], movie_container.children[movies_per_category + 1]);
		movie_container.children[movies_per_category].setAttribute("aria-hidden", "true");
		movie_container.children[movies_displayed].setAttribute("aria-hidden", "false");
	} else {
		movie_container.insertBefore(movie_container.children[movies_per_category], movie_container.children[1]);
		movie_container.children[1].setAttribute("aria-hidden", "false");
		movie_container.children[movies_displayed + 1].setAttribute("aria-hidden", "true");
	}	
}

const set_best_movie = async function() {
	data = await get_query_result("http://localhost:8000/api/v1/titles/?sort_by=-imdb_score");
	best_movie = data.results[0];
	best_movie_div.children[0].children[0].innerHTML = best_movie.title;
	const details = await get_query_result(best_movie.url);
	best_movie_div.children[0].children[2].innerHTML = details.description;
	best_movie_div.children[1].setAttribute("src", best_movie.image_url);
	best_movie_div.children[1].setAttribute("alt", best_movie.title);
	best_movie_div.children[1].setAttribute("movie_url", best_movie.url);
}

const open_modal = async function(button, movie_url, image_url) {
	movie_info = await get_query_result(movie_url);
	const main_doc = document.getElementById("main-content");
	main_doc.setAttribute("aria-hidden", true);
	modal.setAttribute("aria-hidden", false);
	load_modal(modal, movie_info, image_url);
	setTimeout(() => {
		modal_close_button.focus();
  }, 100) // Ca met le focus sur le bouton fermer, ça permet la navigation au clavier.
	last_focus = button;
	all_main_buttons.forEach(button => button.setAttribute("disabled", true));
	main_doc.addEventListener("click", close_modal);
}

const close_modal = function() {
	const modal = document.getElementById("movie_informations");
	const main_doc = document.getElementById("main-content");
	main_doc.setAttribute("aria-hidden", false);
	modal.setAttribute("aria-hidden", true);
	last_focus.focus()
	all_main_buttons.forEach(button => button.removeAttribute("disabled"));
	main_doc.removeEventListener("click", close_modal)
}
	

const convert_in_hours = function(time_in_minutes) {
	const minutes = time_in_minutes % 60
	const hours = (time_in_minutes - minutes) / 60
	const minutes_text = minutes === 0 ? "" : minutes > 1 ? `${minutes} minutes` : "1 minute";
	const hours_text = hours === 0 ? "" : hours > 1 ? `${hours} heures` : "1 heure";
	if (hours_text && minutes_text) {
		return `${hours_text} et ${minutes_text}`
	} else {
		return `${hours_text}${minutes_text}`
	}
}


const load_modal = function(modal, infos, url) {
	modal.children[1].innerHTML = infos.title
	modal.children[2].setAttribute("src", url)
	modal.children[3].innerHTML = `
			<ul>
				<li><span role="legend">Titre</span> : ${infos.title}</li>
				<li><span role="legend">Genres</span> : ${infos.genres.join(", ")}</li>
				<li><span role="legend">Date de sortie</span>: ${infos.date_published}</li>
				<li><span role="legend">Limite d'âge</span> : ${infos.rated === "Not rated or unkown rating" ? "Inconnue" : infos.rated}</li>
				<li><span role="legend">Score IMDB</span> : ${infos.imdb_score}</li>
				<li><span role="legend">Réalisateur</span> : ${infos.directors.join(", ")}</li>
				<li><span role="legend">Acteurs</span> : ${infos.actors.join(", ")}</li>
				<li><span role="legend">Durée</span> : ${convert_in_hours(infos.duration)}</li>
				<li><span role="legend">Pays d'origine</span> : ${infos.countries.join(", ")} </li>
				<li><span role="legend">Résultat au box office</span> : ${infos.worldwide_gross_income === null ? "inconnu" : `${infos.worldwide_gross_income} USD`}</li>
				<li><span role="legend">Résumé</span> : ${infos.long_description}</li>
			</ul> 
			`
}	
	
//Initialize all categories.
categories.forEach(async category => {
	await set_categories(category);
})
	








//Initialize the best movie.
set_best_movie()

best_movie_button_modal.addEventListener('click', event => {
	balise = best_movie_button_modal.parentElement.nextElementSibling;
	open_modal(best_movie_button_modal, balise.getAttribute("movie_url"), balise.getAttribute("src"));
});


//ferme la modale.
modal_close_button.addEventListener('click', event => close_modal(modal_close_button))


	