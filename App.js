const express = require('express');
const app = express();
const cors = require('cors')
const port = 3949;
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: 'admin',
    database: 'EU4',
    port: '5432',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

app.use(express.json());
app.use(cors())
app.use(express.urlencoded({ extended: true }));

app.get('/getdata', (req, res) => {
    pool.query(`SELECT ${req.query.select} FROM ${req.query.table} ${req.query.filter ? `WHERE ${buildWhereClause(req.query.filter)}` : ''} ${getOrderBy(req.query.orderByField, req.query.orderByDirection)}`)
    .then((result) => {
        res.send(JSON.stringify(result.rows));
    });
});

app.post('/addrow', (req, res) => {
    pool.connect((err, client, done) => {
        const shouldAbort = (err) => {
            if (err) {
                console.error('Error in transaction', err.stack)
                client.query('ROLLBACK', (err) => {
                    if (err) {
                        console.error('Error rolling back client', err.stack)
                    }
                    // release the client back to the pool
                    done()
                })
            }
            return !!err
        };

        client.query('BEGIN', (err) => {
            if (shouldAbort(err)) {
                return;
            }
            const queryText = `INSERT INTO ${req.body.table}(${getInsertColumns(req.body.item)}) VALUES(${getInsertValuePlaceHolders(req.body.item)})`;
            console.log(queryText);
            client.query(queryText, getInsertValues(req.body.item), (err, result) => {
                if (shouldAbort(err)) {
                    return;
                }
                client.query('COMMIT', (err) => {
                    if (err) {
                        console.error('Error committing transaction', err.stack);
                    }
                    done();
                    res.send('Item successfully inserted');
                })
            });
        });
    })
});

app.post('/updaterow', (req, res) => {
    pool.connect((err, client, done) => {
        const shouldAbort = (err) => {
            if (err) {
                console.error('Error in transaction', err.stack)
                client.query('ROLLBACK', (err) => {
                    if (err) {
                        console.error('Error rolling back client', err.stack)
                    }
                    // release the client back to the pool
                    done()
                })
            }
            return !!err
        };
        client.query('BEGIN', (err) => {
            if (shouldAbort(err)) {
                return;
            }
            const queryText = `UPDATE "${req.body.table}" SET ${getSetColValues(req.body.item)} WHERE id = ${req.body.id}`;
            console.log(queryText);
            client.query(queryText, getInsertValues(req.body.item), (err, result) => {
                if (shouldAbort(err)) {
                    return;
                }
                client.query('COMMIT', (err) => {
                    if (err) {
                        console.error('Error committing transaction', err.stack);
                    }
                    done();
                    res.send('Item successfully updated');
                })
            });
        });
    });
});

app.listen(port, () => {
    console.log(`App is running http://localhost:${port}`);
});

function buildWhereClause(filter) {
    // "(tech eq 'Indian') and (religion eq 'Sunni')"
    const conditionals = filter.split(' and ');
    if (conditionals.length === 1) {
        let condState = conditionals[0];
        // remove parentheses.
        condState = condState.slice(1, condState.length - 1);
        condState = condState.replace('eq', '=');
        return condState;
    } else {
        const condArr = [];
        for (const cond of conditionals) {
            let condState = cond;
            // remove parentheses.
            condState = condState.slice(1, condState.length - 1);
            condState = condState.replace('eq', '=');
            condArr.push(condState);
        }
        return condArr.join(' AND ');
    }
}

function getOrderBy(orderByField, orderByDirection) {
    if (orderByField === undefined) {
        return '';
    }
    return `ORDER BY ${orderByField} ${orderByDirection}`;
}

function getInsertColumns(reqItem) {
    const itemKeys = Object.keys(reqItem);
    let keysStr = '';
    for (let i = 0; i < itemKeys.length; i++) {
        if (i === 0) {
            keysStr = `${itemKeys[i]}`;
        } else {
            keysStr = `${keysStr}, ${itemKeys[i]}`;
        }
    }
    return keysStr;
}

function getInsertValuePlaceHolders(reqItem) {
    // Indexes will be increased by one in order to ensure that the values will match documentation.
    // This should avoid potential strangeness in the implementation of the insert.
    const keys = Object.keys(reqItem);
    let indexStr = '';
    for (let i = 0; i < keys.length; i++) {
        if (i === 0) {
            indexStr = `$${i + 1}`;
        } else {
            indexStr = `${indexStr}, $${i + 1}`;
        }
    }
    return indexStr;
}

function getInsertValues(reqItem) {
    const keys = Object.keys(reqItem);
    const valueArr = [];
    for (const key of keys) {
        valueArr.push(reqItem[key]);
    }
    return valueArr;
}

function getSetColValues(reqItem) {
    '"${column}" = ($${index1}) [repeated...]'
    let updateStr = '';
    const itemKeys = Object.keys(reqItem);
    for (let i = 0; i < itemKeys.length; i++) {
        if (i === 0) {
            updateStr = `"${itemKeys[i]}" = ($${i + 1})`
        } else {
            updateStr = `${updateStr}, "${itemKeys[i]}" = ($${i + 1})`
        }
    }
    return updateStr
}