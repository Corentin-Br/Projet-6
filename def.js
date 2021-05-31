const buttons_next = document.querySelectorAll('button.next');
const buttons_previous = document.querySelectorAll('button.previous');

const get_movies_number = async movies_data => {
	number_of_movies = movies_data.count < 7 ? movies_data.count : 7;
	return number_of_movies;			
};

const get_query_results = async adress => {
	res = await fetch(adress)
	if (res.ok) {
		return res.json()
	}
};

const get_movies = async (movies_data, movies_number, shift) => {
	const true_shift = shift % movies_number
	if (true_shift > 1) {
		additional_movies_data = await get_query_results(movies_data.next);
		const movies = movies_data.results.concat(additional_movies_data.results)
	} else {
		const movies = movies_data.results
	}
	const movies_id = Array(4).map(index => (true_shift + index)%movies_number);
	const required_movies = movies_id.map(id => movies[id]);
	return required_movies
}	
	

const my_function = async (button, event, shift_change) => {
	const category = button.parentElement;
	const movie_container = category.children[2]
	const shift = parseInt(movie_container.getAttribute("indice")) + shift_change
	movie_container.setAttribute("indice", shift)
	const movies_data = await get_query_results("http://localhost:8000/api/v1/titles/")
	const movies_number = await get_movies_number(movies_data)
	const movies = await get_movies(movies_data, movies_number, shift)
}
	
buttons_next.forEach(button => button.addEventListener('click', event => my_function(button, event, 1)));
buttons_previous.forEach(button => button.addEventListener('click', event => my_function(button, event, -1)));