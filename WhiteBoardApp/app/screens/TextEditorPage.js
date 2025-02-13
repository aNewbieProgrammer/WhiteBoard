/**
 * TextEditorPage.js
 *
 * Authors: Michelle He
 *
 * This is the text editor page that allows users to type code and run it
 */

import React from "react";
import {
  SafeAreaView,
  Alert,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  Platform,
  View,
  ScrollView,
  Text,
  Button,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Icon } from "react-native-elements";
import { Dropdown } from "sharingan-rn-modal-dropdown";

import Topbar from "./shared/Topbar";
import storage from "../config/storage";
import urls from "../requests/urls";

const serverURL = "http://172.16.50.73:8000/";

const languages = [
  {
    label: "Auto",
    value: "Auto",
  },
  {
    label: "C",
    value: "C",
  },
  {
    label: "Java",
    value: "Java",
  },
  {
    label: "C#",
    value: "C#",
  },
];

export default class TextEditorPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      textFromCamera: props.route.params.ocr_text_detected,
      // textFromCamera:"",
      
      typedCode: "",
      lang: "",
      responseReceived: false,
      returnValue: 1,
      returnMessage: "",

      loading: false,
      user: null,
      groupList: null,
      showGroups: false,
      showRenameDlg: false,
      selGroupId: null,
      codeName: "",
    };
  }

  componentDidMount() {
    this.getUserInfo();
  }

  chooseLanguage() {
    if (!this.state.responseReceived) {
      return (
        <Dropdown
          label="Choose Language"
          data={languages}
          onChange={(lang) => {
            this.setState({ lang }, () => {
              console.log(this.state.lang);
            });
          }}
        />
      );
    }
  }

  async sendCode() {
    this.setState({ responseReceived: false });

    if (this.state.lang == "") {
      Alert.alert("Please choose a language.");
    } else {
      try {
        const text = {
          compile_text: this.state.typedCode,
          language: this.state.lang,
        };

        const res = await fetch(urls.temp_text, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(text),
        });
        const response = await res.json();
        Alert.alert("Code Sent", "Your code has been successfully sent!", [
          {
            text: "OK",
            onPress: () => {
              this.setState({ responseReceived: true });

              const terminalOutput = response.problem_line;
              if (terminalOutput[0] != null) {
                this.setState({ returnValue: -1 });
                Alert.alert(
                  "Error",
                  "There are some error occurred. The stack trace will be displayed.",
                  [{ text: "OK" }]
                );
              } else {
                this.setState({ returnValue: 0 });
                Alert.alert(
                  "Success",
                  "Your code runs successfully! The output of your code will be displayed.",
                  [{ text: "OK" }]
                );
              }

              const compileResult = response.compile_result;
              console.log(compileResult);
              this.setState({
                returnMessage: compileResult,
              });
            },
          },
        ]);
      } catch (error) {
        console.log(error);
      }
    }
  }

  displayConsoleLog() {
    if (this.state.responseReceived) {
      if (this.state.returnValue == 0) {
        return (
          <View style={styles.consolelog}>
            <ScrollView style={styles.scroll}>
              <Text style={styles.termOutput}>{this.state.returnMessage}</Text>
            </ScrollView>
          </View>
        );
      } else if (this.state.returnValue == -1) {
        return (
          <View style={styles.consolelog}>
            <ScrollView style={styles.scroll}>
              <Text style={styles.errorMessage}>
                {this.state.returnMessage}
              </Text>
            </ScrollView>
          </View>
        );
      }
    }
  }

  saveOrDiscard() {
    if (this.state.responseReceived) {
      return (
        <View style={styles.saveDiscard}>
          <View style={styles.button}>
            <Button
              title="Save"
              onPress={() => {
                this.selectGroupAndName();
              }}
            />
          </View>
          <View style={styles.button}>
            <Button
              title="Discard"
              color="red"
              onPress={() => {
                Alert.alert(
                  "Are you sure to discard?",
                  "Discarding will not save the code just compiled. You will not be able to see the code anymore after discarding.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Discard",
                      style: "destructive",
                      onPress: () => {
                        this.setState({ responseReceived: false });
                      },
                    },
                  ]
                );
              }}
            />
          </View>
        </View>
      );
    }
  }

  getUserInfo() {
    this.setState({ loading: true });
    storage
      .load({
        key: "login-session",
        autoSync: true,
        syncInBackground: true,
      })
      .then((ret) => {
        this.setState({ user: ret, loading: false });
      })
      .catch((err) => {
        this.setState({ user: false });
      });
  }

  async selectGroupAndName() {
    this.setState({ loading: true });

    // fetch groups
    try {
      const res = await fetch(
        urls.getAllGroups + this.state.user.userInfo.uid,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );
      const response = await res.json();

      this.setState({
        groupList: response.all_groups.map((x) => {
          return { label: x.Gpname, value: x.GpID };
        }),
      });
    } catch (error) {
      console.log("Fetch group error: " + error);
    }

    // show modals
    this.setState({ loading: false }, () => {
      this.setState({ showGroups: true });
    });
  }

  modalHeader() {
    return (
      <View>
        <Text style={styles.title}>Select a Group</Text>
        <View style={styles.divider}></View>
      </View>
    );
  }

  modalBody() {
    return (
      <View style={styles.modalBody}>
        <Dropdown
          label="Select"
          data={this.state.groupList}
          enableSearch
          onChange={(selGroupId) => {
            this.setState({ selGroupId });
          }}
        />

        <View style={{ flexDirection: "row-reverse", margin: 10 }}>
          <TouchableOpacity
            style={{ ...styles.actions, backgroundColor: "#21ba45" }}
            onPress={() => {
              if (this.state.selGroupId) {
                this.setState({ showGroups: false, showRenameDlg: true });
              } else {
                Alert.alert("Please select a group.");
              }
            }}
          >
            <Text style={styles.actionText}>Select</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ ...styles.actions, backgroundColor: "#db2828" }}
            onPress={() => {
              this.setState({ selGroupId: null, showGroups: false });
            }}
          >
            <Text style={styles.actionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  modalContainer() {
    return (
      <View style={styles.modalContain}>
        {this.modalHeader()}
        {this.modalBody()}
      </View>
    );
  }

  groupModal() {
    return (
      <Modal
        transparent={false}
        visible={this.state.showGroups}
        onRequestClose={() => {
          this.setState({ showGroups: false });
        }}
      >
        <View style={styles.modal}>
          <View>{this.modalContainer()}</View>
        </View>
      </Modal>
    );
  }

  renameModal() {
    return (
      <Modal
        transparent={false}
        visible={this.state.showRenameDlg}
        onRequestClose={() => {
          this.setState({ showRenameDlg: false });
        }}
      >
        <View style={styles.modal}>
          <View>
            <View style={styles.modalContain}>
              <View>
                <Text style={styles.title}>Name Your Code</Text>
                <View style={styles.divider}></View>
              </View>
              <View style={styles.modalBody}>
                <TextInput
                  style={styles.naming}
                  placeholder="Type the name here"
                  placeholderTextColor="#808080"
                  onChangeText={(codeName) => this.setState({ codeName })}
                />
                <View style={styles.divider}></View>
                <View style={{ flexDirection: "row-reverse", margin: 10 }}>
                  <TouchableOpacity
                    style={{ ...styles.actions, backgroundColor: "#21ba45" }}
                    onPress={() => {
                      if (this.state.codeName) {
                        this.saveCode();
                      } else {
                        Alert.alert("Enter a image name.");
                      }
                    }}
                  >
                    <Text style={styles.actionText}>OK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ ...styles.actions, backgroundColor: "#db2828" }}
                    onPress={() => {
                      this.setState({
                        selGroupId: null,
                        codeName: "",
                        showRenameDlg: false,
                      });
                    }}
                  >
                    <Text style={styles.actionText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  async saveCode() {
    try {
      const text = {
        compile_text: this.state.typedCode,
        language: this.state.lang,
      };

      const res = await fetch(urls.text_upload + this.state.selGroupId, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(text),
      });
      const response = await res.json();

      Alert.alert("Code Saved", "Your code has been successfully saved!", [
        {
          text: "OK",
          onPress: () => {
            this.setState({
              showRenameDlg: false,
              responseReceived: false,
            });
          },
        },
      ]);
    } catch (error) {
      console.log(error);
    }
    console.log("Group and Name OK");
  }

  render() {
    // const textFromCamera = this.props.navigation.getParam('ocr_text_detected')
    // this.setState({textFromCamera: this.props.route.params.ocr_text_detected?props.route.params.ocr_text_detected:""})
    return (
      <SafeAreaView
        style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 0 : 20 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <Topbar title="Text Editor" navigation={this.props.navigation} />
          </View>
        </TouchableWithoutFeedback>

        <TextInput
          style={styles.input}
          placeholder="Start typying your code here..."
          defaultValue={this.state.textFromCamera?this.state.textFromCamera:""}
          multiline={true}
          onChangeText={(typedCode) => this.setState({ typedCode })}
        />

        <View
          style={{
            flex: 1,
            marginRight: 20,
            marginLeft: 20,
            marginBottom: 25,
          }}
        >
          {this.chooseLanguage()}
        </View>

        <View style={styles.view}>
          <Icon
            name="play"
            type="ionicon"
            color="#000"
            size={40}
            style={styles.play}
            onPress={() =>
              Alert.alert("Attention", "Are you sure of running the code?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Submit",
                  style: "destructive",
                  onPress: () => this.sendCode(),
                },
              ])
            }
          />
        </View>

        <View>{this.displayConsoleLog()}</View>

        <View>{this.saveOrDiscard()}</View>

        {this.groupModal()}

        {this.renameModal()}
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  menu: {
    marginLeft: 10,
  },

  text: {
    fontSize: 20,
    fontWeight: "bold",
    color: "green",
  },

  camera: {
    marginRight: 10,
  },

  input: {
    flex: 11,
    fontSize: 16,
    padding: 10,
  },

  view: {
    flex: 1,
  },

  play: {
    marginTop: 0,
    marginRight: 15,
    alignItems: "flex-end",
  },

  consolelog: {
    height: 170,
  },

  scroll: {
    marginLeft: 20,
    marginRight: 20,
  },

  termOutput: {
    fontFamily: "Courier",
  },

  errorMessage: {
    color: "red",
    fontFamily: "Courier",
  },

  saveDiscard: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 15,
  },

  button: {
    marginLeft: 45,
    marginRight: 30,
  },

  title: {
    fontWeight: "bold",
    fontSize: 20,
    padding: 15,
    color: "#000",
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "lightgray",
  },

  modalBody: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginTop: 10,
  },

  actions: {
    borderRadius: 5,
    marginTop: 30,
    marginHorizontal: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  actionText: {
    color: "#fff",
  },

  modalContain: {
    backgroundColor: "#f9fafb",
    width: "90%",
    borderRadius: 5,
  },

  modal: {
    backgroundColor: "#00000099",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  naming: {
    height: 40,
    padding: 10,
  },
});
