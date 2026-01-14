package types

type RoleType int

const (
	Creator RoleType = iota
	Admin
	Member
	Visitor
	InvalidRole
)
