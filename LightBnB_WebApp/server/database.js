const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

module.exports = {
  /**
   * Get a single user from the database given their email.
   * @param {String} email The email of the user.
   * @return {Promise<{}>} A promise to the user.
   */
getUserWithEmail: function (email) {
    return pool.query(`
  SELECT * FROM users WHERE email = $1;`, [email])
      .then(res => {
        if (res.rows.length > 0) {
          return res.rows[0];
        } else {
          return null;
        }
      });
  },

  /**
   * Get a single user from the database given their id.
   * @param {string} id The id of the user.
   * @return {Promise<{}>} A promise to the user.
   */
  getUserWithId: function (id) {
    return pool.query(`
  SELECT * FROM users WHERE id = $1;`, [id])
      .then(res => {
        if (res.rows.length > 0) {
          return res.rows[0];
        } else {
          return null;
        }
      });
  },

  /**
   * Add a new user to the database.
   * @param {{name: string, password: string, email: string}} user
   * @return {Promise<{}>} A promise to the user.
   */
  addUser: function (user) {
    return pool.query(`INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3) RETURNING *;`, [user.name, user.email, user.password])
      .then(res => res.rows[0]);
  },

  /// Reservations

  /**
   * Get all reservations for a single user.
   * @param {string} guest_id The id of the user.
   * @return {Promise<[{}]>} A promise to the reservations.
   */
  getAllReservations: function (guest_id, limit = 10) {
    return pool.query(`SELECT
  properties.*,
  reservations.*,
  AVG(property_reviews.rating) AS average_rating
FROM
  reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
WHERE
  reservations.guest_id = $1
  AND reservations.end_date < NOW() :: date
GROUP BY
  properties.id,
  reservations.id
ORDER BY
  reservations.start_date
LIMIT
  $2;`, [guest_id, limit])
      .then(res => res.rows);
  },

  /// Properties

  /**
   * Get all properties.
   * @param {{}} options An object containing query options.
   * @param {*} limit The number of results to return.
   * @return {Promise<[{}]>}  A promise to the properties.
   */
  getAllProperties: function (options, limit = 10) {
    const queryParams = [];

    let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_id
  `;

    if (options.city || options.owner_id || options.minimum_price_per_night || options.maximum_price_per_night) {
      queryString += `WHERE `;
    }

    if (options.city) {
      queryParams.push(`%${options.city.slice(1, options.city.length - 1)}%`);
      queryString += `city LIKE $${queryParams.length} `;
    }

    if (options.owner_id) {
      if (queryParams.length > 0) {
        queryString += `AND `;
      }
      queryParams.push(Number(options.owner_id));
      queryString += `owner_id=$${queryParams.length} `;
    }

    if (options.minimum_price_per_night) {
      if (queryParams.length > 0) {
        queryString += `AND `;
      }
      queryParams.push(Number(options.minimum_price_per_night) * 100);
      queryString += `cost_per_night > $${queryParams.length} `;
    }

    if (options.maximum_price_per_night) {
      if (queryParams.length > 0) {
        queryString += `AND `;
      }
      queryParams.push(Number(options.maximum_price_per_night) * 100);
      queryString += `cost_per_night < $${queryParams.length} `;
    }

    queryString += `GROUP BY properties.id `;

    if (options.minimum_rating) {
      queryParams.push(options.minimum_rating);
      queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
    }

    queryParams.push(limit);
    queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

    console.log(queryString, queryParams);

    return pool.query(queryString, queryParams)
      .then(res => res.rows);
  },
  /**
   * Add a property to the database
   * @param {{}} property An object containing all of the property details.
   * @return {Promise<{}>} A promise to the property.
   */
  addProperty: function (property) {
    console.log(property);
    return pool.query(`INSERT INTO properties 
  (owner_id,
  title,
  description,
  thumbnail_photo_url,
  cover_photo_url,
  cost_per_night,
  street,
  city,
  province,
  post_code,
  country,
  parking_spaces,
  number_of_bathrooms,
  number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *;`,
      [property.owner_id,
      property.title,
      property.description,
      property.thumbnail_photo_url,
      property.cover_photo_url,
      property.cost_per_night,
      property.street,
      property.city,
      property.province,
      property.post_code,
      property.country,
      property.parking_spaces,
      property.number_of_bathrooms,
      property.number_of_bedrooms])
      .then(res => res.rows[0]);
  }
}