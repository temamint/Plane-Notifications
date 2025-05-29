const userMap = {
	'119ff6a7-34cd-4c9e-bd3c-6713180db64c': 'Artem Mint',
	'adbe2bdc-1c23-4aed-8dd7-de7c0ebf9a9d': 'Dimasio Ovchinnickov',
	'eb65a721-30fb-4bdd-bcb4-7a392ba628ea': 'Kateryna Diachenko',
	'b3ecba52-6882-436c-969c-6c9ae1dd6dc0': 'Руслан Мельник',
	'f6b9dbc6-cd48-48de-96c8-dc7288f5356a': 'Роман Барабанов',
	'4f01ecb8-02da-40db-9b28-369e019b8c78': 'Dmitriy Shein',
	'ad8d0cda-9e6b-40c1-9067-ce421ab0e209': 'Alexei Kirienko'
};

function getUserNameById(id) {
	return userMap[id] || `Unknown (${id})`;
}

module.exports = { getUserNameById };