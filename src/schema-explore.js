const graphql = require('graphql');
const graphqlTools = require('graphql-tools');
const Cursor = require('immutable-cursor');


const ScalarFactory = Immutable.Record({ name:"", kind: "SCALAR" });
const ObjectFactory = Immutable.Record({ name:"", kind: "OBJECT", getFields: null });
const ListFactory = Immutable.Record({ kind: "LIST", ofType:null });
const NonNullFactory = Immutable.Record( {kind: "NON_NULL", ofType:null });

// a set of immutable Type representations 
// which map to graphql types
export const Type = {
  // helper fn to create a new named scalar type
  // corresponds to GraphQLScalarType
  ScalarType: (name) => new ScalarFactory({name:name}),   
  StringType: new ScalarFactory({name:"String"}),         
  IntegerType: new ScalarFactory({name:"Int"}),
  FloatType: new ScalarFactory({name:"Float"}),
  BooleanType: new ScalarFactory({name:"Boolean"}),

  // helper fns to create composite types
  // corresponds to GraphQLObjectType
  ObjectType: (name, fieldFunc) => new ObjectFactory({name:name, getFields:fieldFunc}),
  // corresponds to GraphQLList
  ListType: (type) => new ListFactory({ofType:type}),
  // corresponds to GraphQLNonNull
  NonNullType: (type) => new NonNullFactory({ofType:type}),
};

const compose = (...functions) => data => functions.reduceRight((value, func) => func(value), data);

// (typeDefs:string) => typeDefsGql:string
// replaces "type Data" by "type Query"
function adaptTypeDefsForGql(typeDefs){
  return  typeDefs.split(/\r?\n/)
          .map(line => line.replace(/(\s*type\s)Data/, "$1Query"))
          .join('\n');
}

// (typedefs:string) => schema
// given a typedefs formatted string return a schema.
// the transformation is done in two steps
// 1.
// Typedefs are parsed with the graphql tools.
// 2.
// the resulting schema is then simplified. We only keep the typeMap property,
// and translate it to an immutable representation
export const schemaFromTypeDefs = compose(convertGqlSchemaToImmutable, 
                                          graphqlTools.buildSchemaFromTypeDefinitions, 
                                          adaptTypeDefsForGql);

// maps graphqlTypeName:string to functions with signature:
// graphqlType => immutableType:Record
const converters = {
  "GraphQLObjectType": type => {
    return Type.ObjectType(type.name, () => {
      let gqlFields = type.getFields();
      let fields = Immutable.Map();
      for(const key of Object.keys(gqlFields)){
        fields = fields.set(key, convertGqlTypeToImmutable(gqlFields[key].type));
      }
      return fields;
    });
  },
  "GraphQLScalarType": type => {
    switch(type.name){
      case "Boolean":
        return Type.BooleanType;
      case "String":
        return Type.StringType;
      case "Int":
        return Type.IntegerType;
      case "Float":
        return Type.FloatType;
      default:
        throw new Error("unsuported Scalar type " + type.name);
    }
  },
  "GraphQLList": type => {
    return Type.ListType(convertGqlTypeToImmutable(type.ofType));
  },
  "GraphQLNonNull": type => {
    return Type.NonNullType(convertGqlTypeToImmutable(type.ofType));
  },
};

// graphqlType => immutableType:Record
function convertGqlTypeToImmutable(type){
  if(!converters.hasOwnProperty(type.constructor.name)){
    console.log(type);
    throw new Error("unsuported type " + type.constructor.name);
  }
  return converters[type.constructor.name](type);
}

// given a gqlSchema return an immutable representation of its typeMap
function convertGqlSchemaToImmutable(gqlSchema){
  // console.log(gqlSchema._typeMap.Query);
  let result = Immutable.Map(gqlSchema._typeMap);
  // console.log(gqlSchema);
  // console.log(result);
  result = result.delete("__Directive")
  .delete("__DirectiveLocation")
  .delete("__EnumValue")
  .delete("__Field")
  .delete("__InputValue")
  .delete("__Schema")
  .delete("__Type")
  .delete("__TypeKind")
  .set("Data", gqlSchema._typeMap.Query)
  .delete("Query");

  result.get("Data").name = "Data";
  result.get("Data")._typeConfig.name = "Data";

  result = result.map(convertGqlTypeToImmutable);

  return result;  
}

function gqlSubProp(type, prop){
  // console.log(type, prop);
  switch(type.kind){
    case "OBJECT":
      return type.getFields().get(prop);
      break;
    case "LIST":
      return type.ofType;
      break;
    default:
      throw new Error("Unsupported type " + type.kind);
  }
}

// given a schema and a path
// return new schema whose entry points to the path
function schemaSelect(schema, path){
  // start with root of given schema
  let prop = schema.get('Data').getFields().get('data');

  let propsInPath = path.slice();
  while(propsInPath.length > 0){
    let propName = propsInPath.shift();
    prop = gqlSubProp(prop, propName);
  }

  const Data = Type.ObjectType("Data", () => {
    let fields = Immutable.Map({data: prop});
    return fields;
  });

  // modify entry pointer of schema
  const result = schema.set("Data", Data);
  return result;
}

// given a dataNugget, a path and a callback
// return a dataNugget where the data property is a cursor representing the data at path,
// and where the schema represents the data at the cursor.
// The callback signals mutations of the cursor.
export function select(dataNugget, path, cb){
  return Immutable.Map({data:Cursor.from(dataNugget.get('data'), path, cb),
                        schema: schemaSelect(dataNugget.get('schema'), path)});
}
