//How many answers per page does the APi send.
var answers_per_API_page = 5 
//How many movies are to be displayed in total per category.
var movies_per_category = 7 // If this value is changed, the html must be changed too.
//How many movies are to displayed simultaneously per category.
var movies_displayed = 4 

//All buttons next
const buttons_next = document.querySelectorAll('button.next');
//All buttons previous
const buttons_previous = document.querySelectorAll('button.previous');
//All categories
const categories = document.querySelectorAll('div.category');
//La div qui représente le meilleur film
const best_movie_div = document.querySelector('div.bestmovie');
//Les boutons qui ouvrent les modales
const buttons_modal = document.querySelectorAll('button.open_modal');
const best_movie_button_modal = document.querySelector('button.best_movie_open_modal')
//Le bouton qui ferme la modale
const modal_close_button = document.querySelector('button[data-dismiss]');
// Dernier focus (pour quand on ferme)
var last_focus;
// La modale
var modal = document.getElementById("movie_informations");



// Return a json with the data asked to the API. It can technically be any URL but...
const get_query_result = async url => {
	res = await fetch(url)
	if (res.ok) {
		return res.json()
	}
};

//  Renvoie une liste avec toutes les infos dont j'ai besoin.
const get_movies = async (query_url, starting_movie) => {
	//Récupère les infos de la première page
	const first_page = await get_query_result(query_url)
	// Calcule combien de pages il faut aller chercher.
	const pages_to_fetch = Math.ceil((movies_per_category + starting_movie) / answers_per_API_page);
	// Crée les urls de toutes les pages dont on a besoin.
	const pages_url = Array(pages_to_fetch-1).fill(1).map((element, index) => (query_url + "&page=" + String(index + 2)));
	// Récupère les infos de toute les pages.
	// On ne PEUT PAS directement faire du map, parce qu'il y a une fonction async appelée plusieurs fois. J'ai utilisé https://advancedweb.hu/how-to-use-async-functions-with-array-map-in-javascript/
	// En l'occurrence je fais du séquentiel, je fais un appel après l'autre.
	const data = await pages_url.reduce(async (accumulator, value) => {
		const results = await accumulator;
		new_result = await get_query_result(value);
		return [...results, new_result]; // Cette notation est équivalente à "results.push(new_result); return results"
	}, []);
	// Mets toutes les infos dans une seule liste.
	let complete_data = first_page.results
	await data.forEach(page => page.results.forEach((result, index) => complete_data.push(result)));
	// Récupère une liste dont la longueur est égale au nombre de films voulus.
	final_data = Array(movies_per_category).fill(1).map((element, index) => complete_data[index+starting_movie]);
	return final_data
}	

//Initialize the pictures
const set_categories = async category => {
	//Create the query
	const query = "http://localhost:8000/api/v1/titles/?" + category.getAttribute("query");
	// Si on en est à la catégorie "meilleurs films", il faut éliminer le meilleur (qui est affiché séparé)
	const ignored_movies = (category.getAttribute("query") === "sort_by=-imdb_score") ? 1 : 0
	// Get all the required data
	const movie_data = await get_movies(query, ignored_movies);
	//Find where the images are
	movies = category.children[2].children
	//Iterate over movie_data to set the images. It should only display a certain number and hide the others. /!\ If movie_data.length and movies.length are different, there will be issues. The HTML must be set correctly.
	movie_data.forEach((movie, index) => {
		movies[index].children[0].setAttribute("src", movie_data[index].image_url);
		movies[index].children[0].setAttribute("alt", movie_data[index].title)
		movies[index].children[0].setAttribute("movie_url", movie_data[index].url);
		if (index >= movies_displayed) {
			movies[index].setAttribute("hidden", "")
		}
	})
}

// Change which pictures are displayed. It will require the CSS to reorganize the pictures afterwards.
const change_displayed_movies = async (category, event=null, shift_change=0) => {
	//Find where the images are.
	const movie_container = category.children[2]
	//Get the value of the shift i.e how much the pictures are moved around.
	const shift = parseInt(movie_container.getAttribute("indice")) + shift_change
	// Change the shift in the HTML (to be reused for future. It uses a modulo to prevent it from growing ad infinitam.
	movie_container.setAttribute("indice", shift % movies_per_category)
	// Get the index values that should NOT be hidden.
	const displayed_movies = Array(movies_displayed).fill(1).map((element, index) => ((shift+index)%movies_per_category + movies_per_category)%movies_per_category) //Obligé de bidouiller si jamais shift+index est négatif.
	// Create an Array that will declare which image must be hidden and which one must not be.
	const movies = Array(movies_per_category).fill(1).map((element, index) => displayed_movies.includes(index) ? "displayed": "hidden")
	// Hide or reveal the image as needed. It affects every picture even if its attribute doesn't change.
	movies.forEach((element, index) => {
		if (movies[index] === "displayed") {
			movie_container.children[index].removeAttribute("hidden")
		} else {
			movie_container.children[index].setAttribute("hidden", "")
		}
	})
}

const set_best_movie = async () => {
	data = await get_query_result("http://localhost:8000/api/v1/titles/?sort_by=-imdb_score");
	best_movie = data.results[0]
	best_movie_div.children[0].innerHTML = best_movie.title
	const details = await get_query_result(best_movie.url)
	best_movie_div.children[2].innerHTML = details.description
	best_movie_div.children[3].setAttribute("src", best_movie.image_url)
	best_movie_div.children[3].setAttribute("alt", best_movie.title)
	best_movie_div.children[3].setAttribute("movie_url", best_movie.url)
}

const open_modal = async(button, movie_url, image_url) => {
	movie_info = await get_query_result(movie_url)
	const main_doc = document.getElementById("main-content")
	main_doc.setAttribute("aria-hidden", true);
	modal.setAttribute("aria-hidden", false);
	load_modal(modal, movie_info, image_url);
	window.setTimeout(() => {
		modal_close_button.focus();
  }, 100) // Ca met le focus sur le bouton fermer, ça permet la navigation au clavier.
	last_focus = button
}

const close_modal = (button) => {
	const modal = button.parentElement;
	const main_doc = document.getElementById("main-content");
	main_doc.setAttribute("aria-hidden", false);
	modal.setAttribute("aria-hidden", true);
	last_focus.focus()
}
	

const convert_in_hours = (time_in_minutes) => {
	let hours;
	let leftover_minutes;
	if (time_in_minutes >= 60) {
		leftover_minutes = time_in_minutes % 60
		hours = (time_in_minutes - leftover_minutes) / 60
	} else {
		hours = 0
	}
	if (hours === 0) {
		return "${time_in_minutes} minutes"
	} else if (leftover_minutes === 0) {
			return "${hours > 1 ? '${hours} heures' : '1 heure'}"
	} else {
		return `${hours > 1 ? `${hours} heures` : "1 heure"} et ${leftover_minutes > 1 ? `${leftover_minutes} minutes` : "1 minute"}`
	}
}
	

const load_modal = (modal, infos, url) => {
	modal.children[1].innerHTML = infos.title
	modal.children[2].innerHTML = `informations à propos de ${infos.title}`
	modal.children[3].setAttribute("src", url)
	modal.children[4].innerHTML = `
			<ul>
				<li>Titre : ${infos.title}</li>
				<li>Genres : ${infos.genres.join(", ")}</li>
				<li>Date de sortie: ${infos.date_published}</li>
				<li>Limite d'âge: ${infos.rated === "Not rated or unkown rating" ? "Inconnue" : infos.rated}</li>
				<li>Score IMDB : ${infos.imdb_score}</li>
				<li>Réalisateur : ${infos.directors.join(", ")}</li>
				<li>Acteurs : ${infos.actors.join(", ")}</li>
				<li>durée : ${convert_in_hours(infos.duration)}</li>
				<li>pays d'origine: ${infos.countries.join(", ")} </li>
				<li>Résultat au box office: ${infos.worldwide_gross_income === null ? "inconnu" : `${infos.worldwide_gross_income} USD`}</li>
				<li> Résumé : ${infos.long_description} </li>
			</ul> 
			`
}	
	

// Set the event for next buttons.
buttons_next.forEach(button => button.addEventListener('click', event => change_displayed_movies(button.parentElement, event, 1)));

// Set the event for previous buttons.
buttons_previous.forEach(button => button.addEventListener('click', event => change_displayed_movies(button.parentElement, event, -1)));

//Initialize all categories.
categories.forEach(async category => {
	await set_categories(category);
})
//Initialize the best movie.
set_best_movie()

// Charge la modale et l'ouvre.
buttons_modal.forEach(button => button.addEventListener('click', event => open_modal(button, button.children[0].getAttribute("movie_url"), button.children[0].getAttribute("src"))));
best_movie_button_modal.addEventListener('click', event => {
	balise = best_movie_button_modal.nextElementSibling.nextElementSibling;
	open_modal(best_movie_button_modal, balise.getAttribute("movie_url"), balise.getAttribute("src"))
})

//ferme la modale.
modal_close_button.addEventListener('click', event => close_modal(modal_close_button))


	