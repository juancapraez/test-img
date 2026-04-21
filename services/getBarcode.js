const axios = require("axios");
const { BASE_URL, BARCODE_URL } = require("../config");

const getBarcode = async (data) => {
  try {
    const url = `${BASE_URL}${BARCODE_URL}`;
    const response = await axios.post(url, data);
    return response.data.barcode;
  } catch (error) {
    console.error("Error al obtener el código de barras:", error.message);
    throw new Error("Error generando el código de barras.");
  }
};

module.exports = { getBarcode };
