import { faker } from '@faker-js/faker';

export function generateSmartRecord(resourceName, fields) {
  const record = { id: faker.string.uuid() };

  fields.forEach((field) => {
    const fieldName = field.name.toLowerCase();
    const mockType = field.mockType || 'auto';

    let matched = true;
    switch(mockType) {
      case 'uuid': record[field.name] = faker.string.uuid(); break;
      case 'mongodb_id': record[field.name] = faker.database.mongodbObjectId(); break;
      case 'first_name': record[field.name] = faker.person.firstName(); break;
      case 'last_name': record[field.name] = faker.person.lastName(); break;
      case 'full_name': record[field.name] = faker.person.fullName(); break;
      case 'email': record[field.name] = faker.internet.email(); break;
      case 'password': record[field.name] = faker.internet.password(); break;
      case 'avatar': record[field.name] = faker.image.avatar(); break;
      case 'words': record[field.name] = faker.lorem.words(3); break;
      case 'paragraph': record[field.name] = faker.lorem.paragraph(); break;
      case 'image_url': record[field.name] = faker.image.url(); break;
      case 'url': record[field.name] = faker.internet.url(); break;
      case 'product_name': record[field.name] = faker.commerce.productName(); break;
      case 'price': record[field.name] = parseFloat(faker.commerce.price()); break;
      case 'age': record[field.name] = faker.number.int({ min: 18, max: 80 }); break;
      case 'amount': record[field.name] = parseFloat(faker.finance.amount()); break;
      case 'company_name': record[field.name] = faker.company.name(); break;
      case 'address': record[field.name] = faker.location.streetAddress(); break;
      case 'city': record[field.name] = faker.location.city(); break;
      case 'country': record[field.name] = faker.location.country(); break;
      case 'phone': record[field.name] = faker.phone.number(); break;
      case 'date_recent': record[field.name] = faker.date.recent().toISOString(); break;
      case 'date_past': record[field.name] = faker.date.past().toISOString(); break;
      default: matched = false; break;
    }

    if (matched) return;
    
    if (field.type === 'boolean') {
      record[field.name] = faker.datatype.boolean();
      return;
    }

    // Pattern matching based on field name
    if(fieldName.includes("id")) {
      record[field.name] = faker.string.uuid();
    } else if (fieldName.includes('email')) {
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
    } else if (fieldName.includes('avatar') || fieldName.includes('picture') || fieldName.includes('photo')) {
      record[field.name] = faker.image.avatar();
    } else if(fieldName.includes('thumbnail') || fieldName.includes('image')) {
      record[field.name] = faker.image.url();
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
