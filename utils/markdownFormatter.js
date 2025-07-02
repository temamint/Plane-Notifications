function escapeMarkdown(text = '') {
	return text
		.replace(/_/g, '\\_')
		.replace(/\*/g, '\\*')
		.replace(/\[/g, '\\[')
		.replace(/\]/g, '\\]')
		.replace(/\(/g, '\\(')
		.replace(/\)/g, '\\)');
}

module.exports = {
	escapeMarkdown,
};