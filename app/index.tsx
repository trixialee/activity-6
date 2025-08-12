import { configureStore, createSlice, nanoid } from "@reduxjs/toolkit";
import * as React from "react";
import { useMemo, useState } from "react";
import { FlatList, SafeAreaView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Appbar, Avatar, Banner, Button, Card, MD3DarkTheme, MD3LightTheme, Provider as PaperProvider, Switch, Text, TextInput } from "react-native-paper";
import { Provider as ReduxProvider, useDispatch, useSelector } from "react-redux";

/********************
 * Redux Store Setup
 ********************/

// UI slice: theme + banners
const uiSlice = createSlice({
  name: "ui",
  initialState: { darkMode: false, showBanner: false, bannerMessage: "" },
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
    },
    showBanner(state, action) {
      state.showBanner = true;
      state.bannerMessage = action.payload;
    },
    dismissBanner(state) {
      state.showBanner = false;
      state.bannerMessage = "";
    },
  },
});

// Todo slice
const todosSlice = createSlice({
  name: "todos",
  initialState: { items: [], lastRemoved: null },
  reducers: {
    addTodo: {
      reducer(state, action) {
        state.items.unshift(action.payload);
      },
      prepare(title) {
        return { payload: { id: nanoid(), title, done: false, createdAt: Date.now() } };
      },
    },
    toggleTodo(state, action) {
      const t = state.items.find((x) => x.id === action.payload);
      if (t) t.done = !t.done;
    },
    removeTodo(state, action) {
      const todo = state.items.find((x) => x.id === action.payload);
      if (todo) {
        state.lastRemoved = todo;
        state.items = state.items.filter((x) => x.id !== action.payload);
      }
    },
    undoLastRemoval(state) {
      if (state.lastRemoved) {
        state.items.unshift(state.lastRemoved);
        state.lastRemoved = null;
      }
    },
    clearTodos(state) {
      state.items = [];
      state.lastRemoved = null;
    },
  },
});

const { toggleDarkMode, showBanner, dismissBanner } = uiSlice.actions;
const { addTodo, toggleTodo, removeTodo, undoLastRemoval, clearTodos } = todosSlice.actions;

const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    todos: todosSlice.reducer,
  },
});

/********************
 * App Root
 ********************/

export default function App() {
  return (
    <ReduxProvider store={store}>
      <ThemedApp />
    </ReduxProvider>
  );
}

function ThemedApp() {
  const darkMode = useSelector((s) => s.ui.darkMode);
  const theme = useMemo(() => (darkMode ? MD3DarkTheme : MD3LightTheme), [darkMode]);
  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={{ flex: 1 }}>
        <AppScaffold />
      </SafeAreaView>
    </PaperProvider>
  );
}

/********************
 * Main App Component
 ********************/

function AppScaffold() {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const showBanner = useSelector((s) => s.ui.showBanner);
  const bannerMessage = useSelector((s) => s.ui.bannerMessage);
  const lastRemoved = useSelector((s) => s.todos.lastRemoved);

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <Appbar.Header>
        <Appbar.Content title="Todo List App" />
        <DarkModeSwitch />
      </Appbar.Header>

      {showBanner && (
        <Banner
          visible
          actions={[
            { 
              label: "Close", 
              onPress: () => dispatch(dismissBanner()) 
            }
          ]}
          icon={({ size }) => (
            <Avatar.Icon size={size} icon="check-circle" />
          )}
        >
          {bannerMessage}
        </Banner>
      )}

      <TodosCard />

      {lastRemoved && (
        <View style={styles.undoContainer}>
          <Button 
            mode="contained" 
            onPress={() => dispatch(undoLastRemoval())}
            icon="undo"
          >
            Undo Last Removal
          </Button>
        </View>
      )}
    </View>
  );
}

function DarkModeSwitch() {
  const dispatch = useDispatch();
  const darkMode = useSelector((s) => s.ui.darkMode);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 12 }}>
      <Text style={{ marginRight: 8 }}>{darkMode ? "Dark" : "Light"}</Text>
      <Switch
        value={darkMode}
        onValueChange={() => dispatch(toggleDarkMode())}
      />
    </View>
  );
}

/********************
 * Todos Component
 ********************/

function TodosCard() {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.todos.items);
  const [title, setTitle] = useState("");

  const handleAddTodo = () => {
    if (!title.trim()) return;
    dispatch(addTodo(title.trim()));
    dispatch(showBanner(`Task "${title.trim()}" has been added!`));
    setTitle("");
  };

  const handleRemoveTodo = (id, title) => {
    dispatch(removeTodo(id));
    dispatch(showBanner(`Task "${title}" removed!`));
  };

  const todos = items.filter((item) => !item.done);
  const completed = items.filter((item) => item.done);

  return (
    <View style={styles.todosContainer}>
      {/* Todo List Section */}
      <Card style={styles.card}>
        <Card.Title 
          title="Todo List" 
          subtitle="Add and manage your tasks"
          left={(props) => <Avatar.Icon {...props} icon="format-list-checks" />}
        />
        <Card.Content>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              label="Add a new task"
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={handleAddTodo}
              returnKeyType="done"
            />
            <Button 
              mode="contained" 
              onPress={handleAddTodo}
              style={styles.addButton}
            >
              Add
            </Button>
          </View>

          <FlatList
            data={todos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={styles.todoItem}>
                <Card.Title
                  title={item.title}
                  subtitle={new Date(item.createdAt).toLocaleString()}
                  left={(props) => (
                    <Avatar.Icon 
                      {...props} 
                      icon={item.done ? "check-circle" : "circle-outline"} 
                      color={item.done ? "green" : "gray"}
                    />
                  )}
                />
                <Card.Actions>
                  <Button 
                    onPress={() => dispatch(toggleTodo(item.id))}
                    mode={item.done ? "text" : "outlined"}
                  >
                    {item.done ? "Undo" : "Done"}
                  </Button>
                  <Button 
                    onPress={() => handleRemoveTodo(item.id, item.title)}
                    textColor="white"
                    buttonColor="red"
                  >
                    Remove
                  </Button>
                </Card.Actions>
              </Card>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No pending tasks!</Text>
            }
          />
        </Card.Content>
      </Card>

      {/* Completed Tasks Section */}
      <Card style={styles.card}>
        <Card.Title
          title="Completed Tasks"
          subtitle="Tasks you've finished"
          left={(props) => <Avatar.Icon {...props} icon="check" />}
        />
        <Card.Content>
          <FlatList
            data={completed}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={styles.todoItem}>
                <Card.Title
                  title={item.title}
                  subtitle={new Date(item.createdAt).toLocaleString()}
                  left={(props) => (
                    <Avatar.Icon
                      {...props}
                      icon="check-circle"
                      color="green"
                    />
                  )}
                />
                <Card.Actions>
                  <Button
                    onPress={() => dispatch(toggleTodo(item.id))}
                    mode="outlined"
                  >
                    Undo
                  </Button>
                  <Button
                    onPress={() => handleRemoveTodo(item.id, item.title)}
                    textColor="white"
                    buttonColor="red"
                  >
                    Remove
                  </Button>
                </Card.Actions>
              </Card>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No completed tasks yet.</Text>
            }
          />
        </Card.Content>
      </Card>
    </View>
  );
}


/********************
 * Styles
 ********************/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6E6FA',
  },
  containerTablet: {
    paddingHorizontal: 20,
  },
  todosContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
  },
  addButton: {
    alignSelf: 'center',
  },
  todoItem: {
    marginBottom: 8,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: 'gray',
    marginTop: 20,
  },
  undoContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
});