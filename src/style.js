export const style = [
	{
		selector: "node",
		style: {
			// shape: "rectangle",
			shape: "data(shape)",
		},
	},
	{
		selector: "edge",
		style: {
			"curve-style": "bezier",
			width: 5,
			"font-family": "monospace",
			"line-color": "#ccc",
			"target-arrow-color": "#ccc",
			"target-arrow-shape": "triangle",
			label: "data(name)",
		},
	},
	{
		selector: ":parent",
		style: {
			"border-width": 1,
			// "border-width": 0,
			"border-style": "solid",
			"border-color": "darkolivegreen",
			"background-color": "antiquewhite",
			"background-opacity": 0.5,
		},
	},
]

export const labelStyle = {
	valign: "top",
	halign: "left",
	valignBox: "top",
	halignBox: "right",
}

export const layoutOptions = {
	name: "cose-bilkent",
	nodeDimensionsIncludeLabels: true,
	fit: true,
	idealEdgeLength: 120,
	padding: 150,
	animate: "end",
}
