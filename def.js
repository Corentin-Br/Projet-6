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
}

const open_modal = async(balise, event) => {
	console.log(balise);
	movie_info = await get_query_result(balise.getAttribute("movie_url"));
	console.log(movie_info);
	const modal = document.getElementById(balise.parentElement.getAttribute("aria-controls"));
	modal.setAttribute("aria-hidden", false);
	load_modal(modal, movie_info, balise.getAttribute("src"))
}

const load_modal = (modal, infos, url) => {
	modal.children[1].innerHTML = infos.title
	modal.children[2].innerHTML = "informations à propos de ${infos.title}"
	modal.children[3].setAttribute("src", url)
	modal.children[4].innerHTML = `
			<ul>
				<li>Titre : ${infos.title}</li>
				<li>Genres : TRANSFORMER LA LISTE EN CHAINE </li>
				<li>Date de sortie: ${infos.date_published}</li>
				<li>Limite d'âge: IL FAUT LE TRADUIRE.</li>
				<li>Score IMDB : ${infos.imdb_score}</li>
				<li>Réalisateur : TRANSFORMER LA LISTE EN CHAINE</li>
				<li>Acteurs : CF AU-DESSUS</li>
				<li>durée : CONVERTIR LES MINUTES EN HEURES</li>
				<li>pays d'origine: TRANSFORMER LA LISTE EN CHAINE </li>
				<li>Résultat au box office: IL FAUT TRADUIRE SI JAMAIS C'EST NULL</li>
				<li> Résumé = ${infos.long_description} </li>
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
buttons_modal.forEach(button => button.addEventListener('click', event => open_modal(button.children[0], event)));


//TODO:
//Fenêtre modale -> La créer, Comment sont obtenues les données? On les fout quelque part? Elles sont fetchées? Peut-être que je mets l'URL où les fetcher dans le HTML?

	