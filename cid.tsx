import * as React from "react"

import { base32 } from "./src/utils"

export default function({
	disabled,
	onSubmit
}: {
	disabled: boolean
	onSubmit: (value: string) => void
}) {
	const [value, setValue] = React.useState("")
	const [valid, setValid] = React.useState(false)

	const handleSubmit = (_: React.FormEvent<HTMLFormElement>) => onSubmit(value)
	const handleChange = ({
		target: { value }
	}: React.ChangeEvent<HTMLInputElement>) => {
		setValue(value)
		setValid(base32.test(value))
	}

	return (
		<form className="cid" onSubmit={handleSubmit}>
			<input
				className="hash"
				placeholder="bafy..."
				type="text"
				value={value}
				onChange={handleChange}
				disabled={disabled}
			/>
			<input
				className="go"
				type="submit"
				value="Go"
				disabled={disabled || !valid}
			/>
		</form>
	)
}
