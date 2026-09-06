import { faker } from '@faker-js/faker';

export function generateSmartRecord(resourceName, fields) {
  const record = { id: faker.string.uuid() };

  fields.forEach((field) => {
    const fieldName = field.name.toLowerCase();
    
    // Pattern matching based on field name
    if (fieldName.includes('email')) {
      record[field.name] = faker.internet.email();
    } else if (fieldName.includes('first') && fieldName.includes('name')) {
      record[field.name] = faker.person.firstName();
    } else if (fieldName.includes('last') && fieldName.includes('name')) {
      record[field.name] = faker.person.lastName();
    } else if (fieldName.includes('name')) {
      if (fieldName.includes('company') || fieldName.includes('business')) {
        record[field.name] = faker.company.name();
      } else if (fieldName.includes('product') || fieldName.includes('item')) {
        record[field.name] = faker.commerce.productName();
      } else {
        record[field.name] = faker.person.fullName();
      }
    } else if (fieldName.includes('password')) {
      record[field.name] = faker.internet.password();
    } else if (fieldName.includes('avatar') || fieldName.includes('image') || fieldName.includes('picture') || fieldName.includes('photo')) {
      record[field.name] = faker.image.avatar();
    } else if (fieldName.includes('price') || fieldName.includes('cost') || fieldName.includes('amount')) {
      record[field.name] = parseFloat(faker.commerce.price());
    } else if (fieldName.includes('title')) {
      record[field.name] = faker.lorem.words(3);
    } else if (fieldName.includes('desc') || fieldName.includes('description') || fieldName.includes('summary')) {
      record[field.name] = faker.lorem.paragraph();
    } else if (fieldName.includes('url') || fieldName.includes('website') || fieldName.includes('link')) {
      record[field.name] = faker.internet.url();
    } else if (fieldName.includes('date') || fieldName.includes('time') || fieldName.includes('created') || fieldName.includes('updated')) {
      record[field.name] = faker.date.recent().toISOString();
    } else if (fieldName.includes('address') || fieldName.includes('street')) {
      record[field.name] = faker.location.streetAddress();
    } else if (fieldName.includes('city')) {
      record[field.name] = faker.location.city();
    } else if (fieldName.includes('country')) {
      record[field.name] = faker.location.country();
    } else if (fieldName.includes('zip') || fieldName.includes('postal')) {
      record[field.name] = faker.location.zipCode();
    } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
      record[field.name] = faker.phone.number();
    } else if (fieldName.includes('company')) {
      record[field.name] = faker.company.name();
    }
    // Fallbacks based on field type
    else {
      if (field.type === 'number') {
        record[field.name] = faker.number.int({ min: 1, max: 1000 });
      } else if (field.type === 'boolean') {
        record[field.name] = faker.datatype.boolean();
      } else {
        // String fallback
        record[field.name] = faker.lorem.words(2);
      }
    }
  });

  return record;
}

export function seedResource(resourceName, fields, count = 3) {
  const records = [];
  for (let i = 0; i < count; i++) {
    records.push(generateSmartRecord(resourceName, fields));
  }
  return records;
}
