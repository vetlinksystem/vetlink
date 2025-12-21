const toNumber = (data) => {
    return !data ? -1 : Number(data);
}

const toBoolean = (data) => {
    return data == 'true' || data == 'True';
}

module.exports = {
    toNumber,
    toBoolean
}