require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const TOKEN = process.env.PRIVATE_APP_ACCESS;
const OBJECT_TYPE = process.env.OBJECT_TYPE;
const API = 'https://api.hubapi.com';
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

// Looks up the internal property names by their labels (Name, Publisher, Price)
let propNames = null;
async function getPropNames() {
  if (propNames) return propNames;
  const { data } = await axios.get(`${API}/crm/v3/schemas/${OBJECT_TYPE}`, { headers });
  const find = (label) => {
    const p = data.properties.find(
      (prop) => prop.label.trim().toLowerCase() === label
    );
    if (!p) throw new Error(`No property labelled "${label}" found on the custom object`);
    return p.name;
  };
  propNames = {
    name: find('name'),
    publisher: find('publisher'),
    price: find('price')
  };
  return propNames;
}

// Route 1: homepage - GET records and show them in a table
app.get('/', async (req, res) => {
  try {
    const p = await getPropNames();
    const url = `${API}/crm/v3/objects/${OBJECT_TYPE}?properties=${p.name},${p.publisher},${p.price}&limit=100`;
    const response = await axios.get(url, { headers });
    const records = response.data.results.map((r) => ({
      id: r.id,
      name: r.properties[p.name],
      publisher: r.properties[p.publisher],
      price: r.properties[p.price]
    }));
    res.render('homepage', {
      title: 'Custom Object Table | Integrating With HubSpot I Practicum',
      records
    });
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
    res.status(500).send('Error fetching records. Check the terminal for details.');
  }
});

// Route 2: render the form
app.get('/update-cobj', (req, res) => {
  res.render('updates', {
    title: 'Update Custom Object Form | Integrating With HubSpot I Practicum'
  });
});

// Route 3: create a record, then redirect to the homepage
app.post('/update-cobj', async (req, res) => {
  try {
    const p = await getPropNames();
    const body = {
      properties: {
        [p.name]: req.body.name,
        [p.publisher]: req.body.publisher,
        [p.price]: req.body.price
      }
    };
    await axios.post(`${API}/crm/v3/objects/${OBJECT_TYPE}`, body, { headers });
    res.redirect('/');
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
    res.status(500).send('Error creating record. Check the terminal for details.');
  }
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));
