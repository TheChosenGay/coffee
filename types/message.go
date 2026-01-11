package types

type Content struct {
}

type TextContent struct {
	Content
	content string
}

type ImageContent struct {
	Content
	content []byte
}

type Message struct {
	contents []Content
}
