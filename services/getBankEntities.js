const axios = require("axios");
const { BASE_URL, BANK_ENTITIES } = require("../config");

const getBankEntities = async () => {
  try {
    const url = `${BASE_URL}${BANK_ENTITIES}`;
    const response = await axios.get(url);
    return response;
  } catch (error) {
    console.error("Error al obtener las entidades bancarias:", error.message);
    throw new Error("Error al obtener las entidades bancarias.");
  }
};

module.exports = { getBankEntities };
