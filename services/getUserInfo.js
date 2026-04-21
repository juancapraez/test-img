const axios = require("axios");
const { BASE_URL, USER_INFO } = require("../config");

const getUserInfo = async (data) => {
  try {
    const url = `${BASE_URL}${USER_INFO}`;
    const response = await axios.post(url, data);
    return response;
  } catch (error) {
    console.error("Error al obtener la informacion del conductor.", error.message);
    throw new Error("Error al obtener la informacion del conductor.");
  }
};

module.exports = { getUserInfo };
