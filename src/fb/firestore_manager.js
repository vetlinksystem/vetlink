const db = require('./firestore_config');

// returns true or false
/**
 * Add data
 * @param {string} collection Asa nga collection i-save ang data 
 * @param {Object} data Mga data nga i-save  
 * @returns true kung na save, false kung wala
 */
const addData = async (collection, data) => {
    const response = await db.collection(collection).doc(data.id).set(data);
    return response.writeTime != null;
}

// returns the data or undefined
/**
 * Get data
 * @param {string} collection Asa nga collection kwaon ang data
 * @param {string} id id sa kwaon nga data
 * @returns ibalik sa imo ang tibook data kung naa
 */
const getData = async (collection, id) => {
    const response = await db.collection(collection).doc(id).get();
    return response.data();
}

// returns an array of objects
/**
 * Get all data
 * @param {string} collection Asa nga collection kwaon ang data
 * @param {Object} filters Mga fields para ma filter ang data
 * @returns ibalik sa imo ang listahan sa data
 */
const getAllData = async (collection, filters, limit = 0, offset = 0) => {
    const allData = [];
    const response = await db.collection(collection).get();
    response.forEach(item => {
        const dataItem = item.data();
        const fields = Object.keys(filters);
        let goodData = true;
        fields.forEach(field => {

            if (!goodData) return;

            // convert to string to always use the .includes() method
            const filterValue = filters[field] + ""; 

            if (!filterValue) {
                return;
            }

            const dataValue = dataItem[field] + "";

            goodData = goodData && dataValue.includes(filterValue);
        });

        if (!goodData) {
            return;
        }

        allData.push({
            ...dataItem
        });
    });

    return allData;
}

// returns true or false
/**
 * Update data
 * @param {string} collection Asa nga collection i-save ang data
 * @param {Object} data Bag-ong data nga i-save
 * @returns true kung na save, false kung wala
 */
const updateData = async (collection, data) => {
    return await addData(collection, data);
}

const updatePartialData = async (collection, data) => {
    const response = await db.collection(collection).doc(data.id).update(data);
    return response.writeTime != null;
}

// returns true or false
/**
 * Delete data
 * @param {string} collection Asa nga collection i-save ang data
 * @param {string} id id sa i-delete nga data
 * @returns true kung na delete, false kung wala
 */
const deleteData = async (collection, id) => {
    const response = await db.collection(collection).doc(id).delete();

    return response.writeTime != null;
}

module.exports = {
    addData,
    getData,
    getAllData,
    updateData,
    updatePartialData,
    deleteData
}