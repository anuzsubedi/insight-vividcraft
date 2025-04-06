import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Text,
  Container,
  HStack,
  Button,
  Avatar,
  Input,
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
  useToast,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { Hammer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import useAuthState from "../hooks/useAuthState";
import { adminService } from "../services/adminService";
import Header from "../components/Header";
import ActionModal from '../components/ActionModal';
import ContentViewModal from '../components/ContentViewModal';

const AdminPage = () => {
  const { user } = useAuthState();
  const [admins, setAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    status: "pending",
    sortBy: "recent",
    adminId: "",
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const toast = useToast();

  const fetchAdmins = useCallback(async () => {
    try {
      const { admins } = await adminService.getAdmins();
      setAdmins(admins);
    } catch (error) {
      toast({
        title: "Error fetching admins",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const { users } = await adminService.searchUsers(searchQuery);
        setSearchResults(users);
      } catch (error) {
        toast({
          title: "Error searching users",
          description: error.message,
          status: "error",
          duration: 3000,
        });
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, toast]);

  const handleAddAdmin = async (username) => {
    try {
      await adminService.addAdmin(username);
      toast({
        title: "Admin added",
        description: `${username} is now an admin`,
        status: "success",
        duration: 3000,
      });
      fetchAdmins();
      setSearchQuery("");
    } catch (error) {
      toast({
        title: "Error adding admin",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleRemoveAdmin = async (username) => {
    if (username === user.username) {
      toast({
        title: "Cannot remove yourself",
        description: "You cannot remove your own admin privileges",
        status: "error",
        duration: 3000,
      });
      return;
    }

    try {
      await adminService.removeAdmin(username);
      toast({
        title: "Admin removed",
        description: `${username} is no longer an admin`,
        status: "success",
        duration: 3000,
      });
      fetchAdmins();
    } catch (error) {
      toast({
        title: "Error removing admin",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  // Reports Management
  const fetchReports = useCallback(async () => {
    try {
      setReports([]); // Clear existing reports while loading
      const { reports: fetchedReports } = await adminService.getReports(reportFilters);
      setReports(fetchedReports || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error fetching reports",
        description: error.response?.data?.details || error.message,
        status: "error",
        duration: 3000,
      });
      setReports([]); // Reset to empty array on error
    }
  }, [reportFilters, toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReportAction = async (action) => {
    if (!selectedReport) return;

    try {
      await adminService.reviewReport(selectedReport.id, {
        action: action.type,
        details: action.details,
      });

      if (action.restrictUser) {
        await adminService.restrictUser(selectedReport.reported_user_id, {
          type: action.restrictUser.type,
          expiresAt: action.restrictUser.expiresAt,
          reason: action.restrictUser.reason,
          reportId: selectedReport.id,
        });
      }

      toast({
        title: "Action taken",
        description: "The report has been processed successfully",
        status: "success",
        duration: 3000,
      });

      setIsActionModalOpen(false);
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      toast({
        title: "Error processing action",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleViewContent = (report) => {
    setSelectedContent({
      id: report.target_id,
      type: report.target_type,
      title: report.title || null,
      body: report.content || 'No content available',
      author: report.contentAuthor
    });
    setIsContentModalOpen(true);
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Header user={user} isAdmin={user.isAdmin} />

      <Container maxW="6xl" py={8}>
        <Tabs variant="enclosed">
          <TabList>
            <Tab>Admin Management</Tab>
            <Tab>Reports</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {/* Existing Admin Management Content */}
              <Box
                bg="white"
                p={6}
                border="2px solid black"
                boxShadow="4px 4px 0 black"
                borderRadius="0"
              >
                <Text fontSize="2xl" fontWeight="bold" mb={6}>
                  Admin Management
                </Text>

                {/* Search Section */}
                <Box mb={8}>
                  <Text fontSize="lg" fontWeight="semibold" mb={3}>
                    Add New Admin
                  </Text>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <SearchIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search users by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      borderWidth="2px"
                      borderColor="black"
                      _hover={{ borderColor: "accent.100" }}
                      _focus={{ borderColor: "accent.100", boxShadow: "4px 4px 0 black" }}
                    />
                  </InputGroup>

                  {/* Search Results */}
                  {searchResults.length > 0 && searchQuery && (
                    <List mt={2} border="1px solid" borderColor="gray.200" borderRadius="md">
                      {searchResults.map((result) => (
                        <ListItem
                          key={result.username}
                          p={3}
                          _hover={{ bg: "gray.50" }}
                          borderBottom="1px solid"
                          borderColor="gray.200"
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <HStack>
                            <Avatar
                              size="sm"
                              name={result.display_name}
                              src={result.avatar_name ? `/avatars/${result.avatar_name}` : undefined}
                            />
                            <Box>
                              <Text fontWeight="bold">{result.display_name}</Text>
                              <Text fontSize="sm" color="gray.600">
                                @{result.username}
                              </Text>
                            </Box>
                            {result.is_admin && (
                              <Badge colorScheme="green" ml={2}>
                                Admin
                              </Badge>
                            )}
                          </HStack>
                          {!result.is_admin && (
                            <Button
                              size="sm"
                              onClick={() => handleAddAdmin(result.username)}
                              borderWidth="2px"
                              borderColor="black"
                              boxShadow="2px 2px 0 black"
                              _hover={{
                                transform: "translate(-1px, -1px)",
                                boxShadow: "3px 3px 0 black",
                              }}
                            >
                              Make Admin
                            </Button>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>

                {/* Current Admins Section */}
                <Box>
                  <Text fontSize="lg" fontWeight="semibold" mb={3}>
                    Current Admins
                  </Text>
                  <List spacing={3}>
                    {admins.map((admin) => (
                      <ListItem
                        key={admin.username}
                        p={4}
                        border="2px solid"
                        borderColor="black"
                        bg="white"
                        boxShadow="3px 3px 0 black"
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <HStack>
                          <Avatar
                            size="md"
                            name={admin.display_name}
                            src={admin.avatar_name ? `/avatars/${admin.avatar_name}` : undefined}
                          />
                          <Box>
                            <Text fontWeight="bold">{admin.display_name}</Text>
                            <Text color="gray.600">@{admin.username}</Text>
                          </Box>
                        </HStack>
                        <Button
                          colorScheme="red"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAdmin(admin.username)}
                          isDisabled={admin.username === user.username}
                          borderWidth="2px"
                          borderColor="black"
                          boxShadow="2px 2px 0 black"
                          _hover={{
                            transform: "translate(-1px, -1px)",
                            boxShadow: "3px 3px 0 black",
                          }}
                        >
                          Remove Admin
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            </TabPanel>

            <TabPanel>
              <Box
                bg="white"
                p={6}
                border="2px solid black"
                boxShadow="4px 4px 0 black"
                borderRadius="0"
              >
                <Text fontSize="2xl" fontWeight="bold" mb={6}>
                  Report Management
                </Text>

                <HStack spacing={4} mb={6}>
                  <Select
                    value={reportFilters.status}
                    onChange={(e) =>
                      setReportFilters((prev) => ({ ...prev, status: e.target.value }))
                    }
                    borderWidth="2px"
                    borderColor="black"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="all">All</option>
                  </Select>

                  <Select
                    value={reportFilters.sortBy}
                    onChange={(e) =>
                      setReportFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                    }
                    borderWidth="2px"
                    borderColor="black"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="most_reported">Most Reported</option>
                  </Select>

                  <Select
                    value={reportFilters.adminId}
                    onChange={(e) =>
                      setReportFilters((prev) => ({ ...prev, adminId: e.target.value }))
                    }
                    borderWidth="2px"
                    borderColor="black"
                  >
                    <option value="">All Admins</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.display_name}
                      </option>
                    ))}
                  </Select>
                </HStack>

                <Table variant="simple" layout="fixed">
                  <Thead>
                    <Tr>
                      <Th width="40%">Reported Content</Th>
                      <Th width="15%">Category</Th>
                      <Th width="15%">Reporter</Th>
                      <Th width="15%">Date</Th>
                      <Th width="15%">Status</Th>
                      <Th width="100px">Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {reports.map((report) => (
                      <Tr key={report.id}>
                        <Td maxWidth="400px">
                          <VStack align="start" spacing={2} width="100%">
                            <HStack width="100%" justify="space-between">
                              <Badge 
                                colorScheme={report.target_type === "post" ? "blue" : "purple"}
                                px={2}
                                py={1}
                                borderRadius="full"
                              >
                                {report.target_type === "post" ? "Post" : "Comment"}
                              </Badge>
                              <Text fontSize="xs" color="gray.400">
                                ID: {report.target_id}
                              </Text>
                            </HStack>
                            
                            <Box 
                              cursor="pointer" 
                              width="100%"
                              p={3}
                              bg="gray.50"
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor="gray.200"
                              _hover={{ 
                                bg: "gray.100",
                                borderColor: "blue.200"
                              }}
                              onClick={() => handleViewContent(report)}
                            >
                              {report.contentAuthor && (
                                <HStack mb={2} spacing={1}>
                                  <Text fontSize="sm" color="gray.500">by</Text>
                                  <Text fontSize="sm">@{report.contentAuthor.username}</Text>
                                  {report.contentAuthor.display_name && (
                                    <Text fontSize="sm" color="gray.500">({report.contentAuthor.display_name})</Text>
                                  )}  
                                </HStack>
                              )}
                              <Text fontSize="sm" color="gray.800" noOfLines={3}>
                                {report.title ? (
                                  <Text as="span" fontWeight="bold">{report.title}<br/></Text>
                                ) : null}
                                {report.content || 'No content available'}
                              </Text>
                            </Box>
                          </VStack>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              report.category === 'Spam' ? 'orange' :
                              report.category === 'Violence and Sex' ? 'red' :
                              report.category === 'Promotes Bullying' ? 'purple' :
                              'gray'
                            }
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            {report.category}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="sm" fontWeight="medium">
                            @{report.reporter?.username || report.user?.username}
                          </Text>
                        </Td>
                        <Td whiteSpace="nowrap">
                          {formatDistanceToNow(new Date(report.created_at))} ago
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              report.status === "pending"
                                ? "yellow"
                                : report.status === "reviewed"
                                ? "green"
                                : "gray"
                            }
                            px={2}
                            py={1}
                            borderRadius="full"
                          >
                            {report.status}
                          </Badge>
                        </Td>
                        <Td textAlign="center">
                          <Tooltip label="Take Action" hasArrow>
                            <IconButton
                              aria-label="Take action"
                              icon={<Hammer />}
                              size="sm"
                              colorScheme="blue"
                              isDisabled={report.status !== "pending"}
                              onClick={() => {
                                setSelectedReport(report);
                                setIsActionModalOpen(true);
                              }}
                              borderWidth="2px"
                              borderColor="black"
                              boxShadow="2px 2px 0 black"
                              _hover={{
                                transform: 'translate(-1px, -1px)',
                                boxShadow: '3px 3px 0 black'
                              }}
                              _active={{
                                transform: 'translate(0, 0)',
                                boxShadow: '1px 1px 0 black'
                              }}
                              _disabled={{
                                opacity: 0.6,
                                cursor: 'not-allowed',
                                boxShadow: 'none',
                                transform: 'none'
                              }}
                            />
                          </Tooltip>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>

      {/* Action modal for taking moderation actions */}
      <ActionModal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setSelectedReport(null);
        }}
        onConfirm={handleReportAction}
        report={selectedReport}
      />

      {/* Content view modal for displaying full reported content */}
      <ContentViewModal
        isOpen={isContentModalOpen}
        onClose={() => {
          setIsContentModalOpen(false);
          setSelectedContent(null);
        }}
        content={selectedContent}
      />
    </Box>
  );
};

export default AdminPage;