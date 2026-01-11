package types

type Coffee struct {
	Id           int    `json:"id"`
	Name         string `json:"name"`
	CoverUrl     string `json:"cover_url"`
	Category     string `json:"category"`
	ProdLocation string `json:"prod_location"`
}

type CoffeeResponse struct {
	Coffee Coffee `json:"coffee"`
}

type CoffeeListResponse struct {
	Coffees []Coffee `json:"coffees"`
}
